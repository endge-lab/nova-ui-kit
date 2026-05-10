import { describe, expect, it } from 'vitest'
import type { NovaNode } from '@endge/nova'
import { normalizeGridProps } from '@/components/Grid/Grid.config'
import {
  GridLayoutEngine,
  createGridChildEntry,
} from '@/components/Grid/GridLayoutEngine'
import {
  NOVA_UI_STYLE_TARGET,
  NovaUiStyleMask,
  matchStyleRules,
  resolveNovaUiStyleSheetTokens,
  validateNovaUiStyleSheetSource,
  type NovaUiCompiledStyleSheet,
  type NovaUiStyleContext,
  type NovaUiStyleReceiveResult,
  type NovaUiStyleTarget,
  type NovaUiStyleTokenResolver,
  type NovaUiStylableNode,
} from '@/shared/style'
import {
  copyRect,
  rectEquals,
  type NovaUiLayoutRect,
} from '@/shared/layout'

interface BenchStats {
  scenario: string
  size: number
  averageMs: number
  worstMs: number
  renderCount: number
  updateCount: number
  skippedCount: number
  rating: 'плохо' | 'приемлемо' | 'хорошо' | 'отлично' | 'идеально'
}

class BenchTextTarget implements NovaUiStyleTarget {
  readonly [NOVA_UI_STYLE_TARGET] = true as const
  renderCount = 0
  updateCount = 0
  receiveCount = 0

  constructor(private readonly explicitMask = NovaUiStyleMask.None) {}

  receiveStyleContext(_context: NovaUiStyleContext, changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    this.receiveCount += 1
    const affected = changedMask & this.getSubtreeStyleMask()

    if (affected === NovaUiStyleMask.None) {
      return { update: false, render: false, layout: false }
    }

    if ((affected & TEXT_LAYOUT_MASK) !== 0) {
      this.updateCount += 1
      this.renderCount += 1
      return { update: true, render: true, layout: true }
    }

    if ((affected & NovaUiStyleMask.Color) !== 0) {
      this.renderCount += 1
      return { update: false, render: true, layout: false }
    }

    return { update: false, render: false, layout: false }
  }

  getSubtreeStyleMask(): NovaUiStyleMask {
    return NovaUiStyleMask.AllText & ~this.explicitMask
  }
}

class BenchContainerTarget implements NovaUiStyleTarget {
  readonly [NOVA_UI_STYLE_TARGET] = true as const
  receiveCount = 0
  skippedCount = 0

  constructor(
    private readonly children: Array<NovaUiStyleTarget>,
    private readonly ownStyleMask = NovaUiStyleMask.None,
  ) {}

  receiveStyleContext(context: NovaUiStyleContext, changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    this.receiveCount += 1
    const result: NovaUiStyleReceiveResult = { update: false, render: false, layout: false }

    for (const child of this.children) {
      const childMask = child.getSubtreeStyleMask()
      if ((changedMask & childMask) === 0) {
        this.skippedCount += 1
        continue
      }

      const childResult = child.receiveStyleContext(context, changedMask & childMask)
      result.update ||= childResult.update
      result.render ||= childResult.render
      result.layout ||= childResult.layout
    }

    return result
  }

  getSubtreeStyleMask(): NovaUiStyleMask {
    let mask = NovaUiStyleMask.None
    for (const child of this.children) {
      mask |= child.getSubtreeStyleMask()
    }
    return mask & ~this.ownStyleMask
  }
}

const TEXT_LAYOUT_MASK = (
  NovaUiStyleMask.FontFamily
  | NovaUiStyleMask.FontSize
  | NovaUiStyleMask.FontWeight
  | NovaUiStyleMask.FontStyle
  | NovaUiStyleMask.LineHeight
)

const BENCH_ITERATIONS = 6

describe('Nova UI style propagation performance', () => {
  it('benchmarks stylesheet compile hot path', () => {
    const results = [100, 1_000].map(size => {
      const source = createBenchmarkStyleSource(size)
      return measureBench(`stylesheet compile ${size}`, size, () => {
        const result = validateNovaUiStyleSheetSource(source)
        return {
          renderCount: result.styleSheet?.rules.length ?? 0,
          updateCount: 0,
          skippedCount: result.diagnostics.length,
        }
      })
    })

    for (const result of results) {
      logBench(result)
      expect(result.renderCount).toBe(result.size)
      expect(result.skippedCount).toBe(0)
      expect(result.averageMs).toBeLessThan(100)
    }
  })

  it('benchmarks NovaCSS theme token resolution hot path', () => {
    const size = 100
    const sheet = validateNovaUiStyleSheetSource(createBenchmarkTokenStyleSource(size)).styleSheet as NovaUiCompiledStyleSheet
    const resolver = createBenchmarkTokenResolver()
    const result = measureBench('stylesheet token resolve 100', size, () => {
      const resolved = resolveNovaUiStyleSheetTokens(sheet, resolver)
      return {
        renderCount: resolved.rules.length,
        updateCount: 0,
        skippedCount: resolved.tokenDependencies?.length ?? 0,
      }
    })

    logBench(result)
    expect(result.renderCount).toBe(size)
    expect(result.skippedCount).toBeGreaterThan(0)
    expect(result.averageMs).toBeLessThan(150)
  })

  it('benchmarks invalid stylesheet validation', () => {
    const size = 1_000
    const source = Array.from({ length: size }, (_item, index) => (
      `TextBlock.invalid-${index} { fontSize: nope; }`
    )).join('\n')
    const result = measureBench('invalid stylesheet validation 1000', size, () => {
      const validation = validateNovaUiStyleSheetSource(source)
      return {
        renderCount: 0,
        updateCount: 0,
        skippedCount: validation.diagnostics.length,
      }
    })

    logBench(result)
    expect(result.skippedCount).toBeGreaterThanOrEqual(size)
    expect(result.averageMs).toBeLessThan(100)
  })

  it('benchmarks selector matching for indexed rules', () => {
    const source = createBenchmarkStyleSource(1_000)
    const sheet = validateNovaUiStyleSheetSource(source).styleSheet!
    const results = [1_000, 5_000, 10_000].map(size => {
      const nodes = createBenchmarkStyleNodes(size)
      return measureBench(`selector matching ${size}`, size, () => {
        let matches = 0
        for (const node of nodes) matches += matchStyleRules(node, sheet).length
        return {
          renderCount: matches,
          updateCount: 0,
          skippedCount: size - matches,
        }
      })
    })

    for (const result of results) {
      logBench(result)
      expect(result.renderCount).toBe(result.size)
      expect(result.averageMs).toBeLessThan(100)
    }
  })

  it('benchmarks cursor pseudo selector compile and matching', () => {
    const source = Array.from({ length: 1_000 }, (_item, index) => (
      `TextBlock.item-${index}:hover { cursor: component("ResizeCursor", { "axis": "x" }, 8 8); }`
    )).join('\n')
    const sheet = validateNovaUiStyleSheetSource(source).styleSheet!
    const nodes = createBenchmarkStyleNodes(10_000)
    const result = measureBench('cursor pseudo selector matching 10000', nodes.length, () => {
      let matches = 0
      for (const node of nodes) {
        const rules = matchStyleRules(node, sheet)
        if (rules[0]?.declarations.cursor !== undefined) matches += 1
      }
      return {
        renderCount: matches,
        updateCount: 0,
        skippedCount: nodes.length - matches,
      }
    })

    logBench(result)
    expect(sheet.rules).toHaveLength(1_000)
    expect(result.renderCount).toBe(nodes.length)
    expect(result.averageMs).toBeLessThan(100)
  })

  it('benchmarks selector cascade style diff budget', () => {
    const size = 10_000
    const sheet = validateNovaUiStyleSheetSource('TextBlock.item { color: #123456; }').styleSheet as NovaUiCompiledStyleSheet
    const nodes = createBenchmarkStyleNodes(size, 'item')
    const result = measureBench('selector color render-only 10000', size, () => {
      let renderCount = 0
      for (const node of nodes) {
        if (matchStyleRules(node, sheet).length > 0) renderCount += 1
      }
      return {
        renderCount,
        updateCount: 0,
        skippedCount: size - renderCount,
      }
    })

    logBench(result)
    expect(result.renderCount).toBe(size)
    expect(result.updateCount).toBe(0)
    expect(result.averageMs).toBeLessThan(100)
  })

  it('benchmarks render-only inherited color propagation', () => {
    const results = [1_000, 5_000, 10_000].map(size => {
      const targets = Array.from({ length: size }, () => new BenchTextTarget())
      const root = new BenchContainerTarget(targets)
      return measureBench(`style color render-only ${size}`, size, () => {
        resetBenchTargets(targets, root)
        root.receiveStyleContext(createContext('#ff0000'), NovaUiStyleMask.Color)
        return collectStats(targets, root)
      })
    })

    for (const result of results) {
      logBench(result)
      expect(result.renderCount).toBe(result.size)
      expect(result.updateCount).toBe(0)
      expect(result.averageMs).toBeLessThan(100)
    }
  })

  it('benchmarks layout-affecting inherited font propagation', () => {
    const results = [1_000, 5_000].map(size => {
      const targets = Array.from({ length: size }, () => new BenchTextTarget())
      const root = new BenchContainerTarget(targets)
      return measureBench(`font layout-affecting ${size}`, size, () => {
        resetBenchTargets(targets, root)
        root.receiveStyleContext(createContext('#000000', 18), NovaUiStyleMask.FontSize)
        return collectStats(targets, root)
      })
    })

    for (const result of results) {
      logBench(result)
      expect(result.renderCount).toBe(result.size)
      expect(result.updateCount).toBe(result.size)
      expect(result.averageMs).toBeLessThan(100)
    }
  })

  it('benchmarks explicit override skip for inherited color', () => {
    const size = 10_000
    const explicitCount = 8_000
    const targets = Array.from({ length: size }, (_item, index) => (
      new BenchTextTarget(index < explicitCount ? NovaUiStyleMask.Color : NovaUiStyleMask.None)
    ))
    const root = new BenchContainerTarget(targets)
    const result = measureBench('explicit override skip 10000', size, () => {
      resetBenchTargets(targets, root)
      root.receiveStyleContext(createContext('#00aa00'), NovaUiStyleMask.Color)
      return collectStats(targets, root)
    })

    logBench(result)
    expect(result.renderCount).toBe(size - explicitCount)
    expect(result.updateCount).toBe(0)
    expect(result.skippedCount).toBeGreaterThanOrEqual(explicitCount)
    expect(result.averageMs).toBeLessThan(100)
  })

  it('benchmarks subtree skip for overridden branch style', () => {
    const branchCount = 10
    const branchSize = 1_000
    const branches: Array<BenchContainerTarget> = []
    const branchTargets: Array<Array<BenchTextTarget>> = []

    for (let index = 0; index < branchCount; index += 1) {
      const targets = Array.from({ length: branchSize }, () => new BenchTextTarget())
      branchTargets.push(targets)
      branches.push(new BenchContainerTarget(
        targets,
        index < 8 ? NovaUiStyleMask.Color : NovaUiStyleMask.None,
      ))
    }

    const root = new BenchContainerTarget(branches)
    const result = measureBench('subtree skip 10000', branchCount * branchSize, () => {
      for (const targets of branchTargets) resetBenchTargets(targets)
      resetBenchContainer(root)
      for (const branch of branches) resetBenchContainer(branch)

      root.receiveStyleContext(createContext('#334455'), NovaUiStyleMask.Color)
      const branchStats = branches.reduce((acc, branch) => {
        acc.skippedCount += branch.skippedCount
        return acc
      }, { skippedCount: root.skippedCount })
      const leafStats = branchTargets.flat()
      return {
        ...collectStats(leafStats, root),
        skippedCount: branchStats.skippedCount,
      }
    })

    logBench(result)
    expect(result.renderCount).toBe(2_000)
    expect(result.updateCount).toBe(0)
    expect(result.skippedCount).toBeGreaterThanOrEqual(8)
    expect(result.averageMs).toBeLessThan(100)
  })

  it('benchmarks responsive grid resize hot path and unchanged rect skip', () => {
    const size = 5_000
    const engine = new GridLayoutEngine()
    const entries = Array.from({ length: size }, (item, index) => (
      createGridChildEntry(`item-${index}`, createBenchNode(0, 96), { height: 96 })
    ))
    const prevRects = entries.map(() => ({ x: 0, y: 0, width: 0, height: 0 }))
    const wideProps = normalizeGridProps({
      responsive: true,
      minColumnWidth: 220,
      maxColumns: 5,
      gap: 12,
      rowHeight: 96,
      padding: 24,
    })
    const narrowProps = normalizeGridProps({
      responsive: true,
      minColumnWidth: 220,
      maxColumns: 5,
      gap: 12,
      rowHeight: 96,
      padding: 24,
    })

    const result = measureBench('resize layout grid 5000', size, () => {
      resetRects(prevRects)
      engine.compute({
        props: wideProps,
        width: 1440,
        height: 900,
        entries,
      })
      const firstChangedRects = applyEntryRects(entries, prevRects)
      engine.compute({
        props: wideProps,
        width: 1440,
        height: 900,
        entries,
      })
      const unchangedRects = countUnchangedEntryRects(entries, prevRects)
      engine.compute({
        props: narrowProps,
        width: 1040,
        height: 900,
        entries,
      })
      const resizedChangedRects = applyEntryRects(entries, prevRects)

      return {
        renderCount: firstChangedRects + resizedChangedRects,
        updateCount: firstChangedRects + resizedChangedRects,
        skippedCount: unchangedRects,
      }
    })

    logBench(result)
    expect(result.renderCount).toBeGreaterThanOrEqual(size)
    expect(result.skippedCount).toBeGreaterThanOrEqual(size)
    expect(result.averageMs).toBeLessThan(100)
  })
})

function createContext(color: string, fontSize?: number): NovaUiStyleContext {
  return {
    values: {
      color,
      fontSize,
    },
    mask: fontSize === undefined
      ? NovaUiStyleMask.Color
      : NovaUiStyleMask.Color | NovaUiStyleMask.FontSize,
    version: 1,
  }
}

function measureBench(
  scenario: string,
  size: number,
  run: () => { renderCount: number; updateCount: number; skippedCount: number },
): BenchStats {
  const times: Array<number> = []
  let stats = { renderCount: 0, updateCount: 0, skippedCount: 0 }

  for (let index = 0; index < BENCH_ITERATIONS; index += 1) {
    const start = performance.now()
    stats = run()
    times.push(performance.now() - start)
  }

  const averageMs = times.reduce((sum, value) => sum + value, 0) / times.length
  const worstMs = Math.max(...times)

  return {
    scenario,
    size,
    averageMs: roundMs(averageMs),
    worstMs: roundMs(worstMs),
    renderCount: stats.renderCount,
    updateCount: stats.updateCount,
    skippedCount: stats.skippedCount,
    rating: rateBench(averageMs, size),
  }
}

function collectStats(targets: Array<BenchTextTarget>, root: BenchContainerTarget): { renderCount: number; updateCount: number; skippedCount: number } {
  return targets.reduce((acc, target) => {
    acc.renderCount += target.renderCount
    acc.updateCount += target.updateCount
    return acc
  }, {
    renderCount: 0,
    updateCount: 0,
    skippedCount: root.skippedCount,
  })
}

function resetBenchTargets(targets: Array<BenchTextTarget>, root?: BenchContainerTarget): void {
  for (const target of targets) {
    target.renderCount = 0
    target.updateCount = 0
    target.receiveCount = 0
  }
  if (root) resetBenchContainer(root)
}

function resetBenchContainer(container: BenchContainerTarget): void {
  container.receiveCount = 0
  container.skippedCount = 0
}

function createBenchNode(width: number, height: number): NovaNode<any> {
  return {
    width,
    height,
  } as NovaNode<any>
}

function resetRects(rects: Array<NovaUiLayoutRect>): void {
  for (const rect of rects) {
    rect.x = 0
    rect.y = 0
    rect.width = 0
    rect.height = 0
  }
}

function applyEntryRects(entries: Array<{ nextRect: NovaUiLayoutRect }>, prevRects: Array<NovaUiLayoutRect>): number {
  let changed = 0

  for (let index = 0; index < entries.length; index += 1) {
    const nextRect = entries[index].nextRect
    if (rectEquals(nextRect, prevRects[index])) continue
    copyRect(prevRects[index], nextRect)
    changed += 1
  }

  return changed
}

function countUnchangedEntryRects(entries: Array<{ nextRect: NovaUiLayoutRect }>, prevRects: Array<NovaUiLayoutRect>): number {
  let unchanged = 0

  for (let index = 0; index < entries.length; index += 1) {
    if (rectEquals(entries[index].nextRect, prevRects[index])) unchanged += 1
  }

  return unchanged
}

function roundMs(value: number): number {
  return Math.round(value * 1000) / 1000
}

function rateBench(averageMs: number, size: number): BenchStats['rating'] {
  const perThousand = averageMs / Math.max(1, size / 1000)
  if (perThousand <= 0.05) return 'идеально'
  if (perThousand <= 0.15) return 'отлично'
  if (perThousand <= 0.5) return 'хорошо'
  if (perThousand <= 1.5) return 'приемлемо'
  return 'плохо'
}

function logBench(result: BenchStats): void {
  console.log(`[nova-ui-kit-bench] ${JSON.stringify(result)}`)
}

function createBenchmarkStyleSource(size: number): string {
  return Array.from({ length: size }, (_item, index) => (
    `TextBlock.item-${index} { color: #123456; fontSize: ${12 + (index % 6)}; }`
  )).join('\n')
}

function createBenchmarkTokenStyleSource(size: number): string {
  return Array.from({ length: size }, (_item, index) => (
    `TextBlock.theme-${index} { color: var(--nova-text-${index % 16}, #111111); fontSize: var(--nova-font-${index % 4}, 13); }`
  )).join('\n')
}

function createBenchmarkTokenResolver(): NovaUiStyleTokenResolver {
  const values = new Map<string, string>()
  for (let index = 0; index < 16; index += 1) {
    values.set(`--nova-text-${index}`, `#${(index + 1).toString(16).padStart(6, '0')}`)
  }
  for (let index = 0; index < 4; index += 1) {
    values.set(`--nova-font-${index}`, String(12 + index))
  }

  return {
    version: 1,
    resolve: (name, fallback) => values.get(name) ?? fallback,
  }
}

function createBenchmarkStyleNodes(size: number, className?: string): Array<NovaUiStylableNode> {
  return Array.from({ length: size }, (_item, index) => ({
    componentId: `node-${index}`,
    descriptor: {
      name: 'TextBlock',
    },
    __type: 'TextBlock',
    parent: null,
    getProps: () => ({
      className: className ?? `item-${index % 1000}`,
      attrs: {},
    }),
  })) as Array<NovaUiStylableNode>
}
