import { describe, expect, it } from 'vitest'
import type { NovaApp, NovaNode } from '@endge/nova'
import {
  NovaUiStyleDependencyTracker,
  createEmptyStyleSheet,
  createNovaUiStyleIdentityRegistry,
  createNovaUiStyleSheetGraph,
  createNovaUiStyleSheetDataPath,
  createNovaUiStyleTokenDataPath,
  planNovaUiMediaInvalidation,
  planNovaUiStyleSheetInvalidation,
  resolveNovaUiVirtualStyleDeclarations,
  validateNovaUiStyleSheetSource,
  type NovaUiStyleComponentName,
} from '@/shared/style'

class TestStyleNode {
  readonly descriptor: { name: string }
  readonly __type: string
  parent: TestStyleNode | null = null
  children: Array<TestStyleNode> = []

  constructor(
    readonly componentId: string,
    type: NovaUiStyleComponentName,
    private props: Record<string, unknown> = {},
  ) {
    this.descriptor = { name: type }
    this.__type = type
  }

  getProps(): Record<string, unknown> {
    return this.props
  }

  setProps(patch: Record<string, unknown>): void {
    this.props = { ...this.props, ...patch }
  }

  append(child: TestStyleNode): TestStyleNode {
    child.parent = this
    this.children.push(child)
    return child
  }

  traverseAll(visitor: (node: unknown) => void): void {
    visitor(this)
    for (const child of this.children) child.traverseAll(visitor)
  }
}

describe('NovaCSS style subscriptions graph', () => {
  it('selects exact candidates for id, class, type and attr selector changes', () => {
    const root = new TestStyleNode('root', 'Root')
    const byClass = root.append(new TestStyleNode('class-node', 'TextBlock', { className: 'featured' }))
    const byAttr = root.append(new TestStyleNode('attr-node', 'TextBlock', { attrs: { role: 'title' } }))
    const byType = root.append(new TestStyleNode('type-node', 'Button'))
    const registry = createNovaUiStyleIdentityRegistry(root)
    const previous = createNovaUiStyleSheetGraph(createEmptyStyleSheet())
    const next = createNovaUiStyleSheetGraph(validateNovaUiStyleSheetSource(`
      .featured { color: #111111; }
      [role="title"] { color: #222222; }
      Button { background: #333333; }
    `).styleSheet!)

    const plan = planNovaUiStyleSheetInvalidation(previous, next, registry)

    expect(plan.fallback).toBe(false)
    expect(plan.candidates).toEqual(new Set([byClass, byAttr, byType]))
  })

  it('expands ancestor selector changes to matching descendants', () => {
    const root = new TestStyleNode('root', 'Root')
    const panel = root.append(new TestStyleNode('panel', 'Flex', { className: 'panel' }))
    const target = panel.append(new TestStyleNode('title', 'TextBlock'))
    root.append(new TestStyleNode('outside', 'TextBlock'))
    const registry = createNovaUiStyleIdentityRegistry(root)
    const previous = createNovaUiStyleSheetGraph(createEmptyStyleSheet())
    const next = createNovaUiStyleSheetGraph(validateNovaUiStyleSheetSource(`
      .panel TextBlock { color: #111111; }
    `).styleSheet!)

    const plan = planNovaUiStyleSheetInvalidation(previous, next, registry)

    expect(plan.fallback).toBe(false)
    expect(plan.candidates.has(target)).toBe(true)
    expect(plan.candidates.has(panel)).toBe(false)
  })

  it('plans media candidate invalidation only for media rules', () => {
    const root = new TestStyleNode('root', 'Root')
    const target = root.append(new TestStyleNode('target', 'TextBlock', { className: 'title' }))
    root.append(new TestStyleNode('plain', 'Button'))
    const registry = createNovaUiStyleIdentityRegistry(root)
    const graph = createNovaUiStyleSheetGraph(validateNovaUiStyleSheetSource(`
      Button { background: #111111; }
      @media canvas and (min-width: 900px) {
        TextBlock.title { color: #222222; }
      }
    `).styleSheet!)

    const plan = planNovaUiMediaInvalidation(graph, registry, { width: 800, height: 600 }, { width: 920, height: 600 })

    expect(plan.fallback).toBe(false)
    expect(plan.changedMediaAtoms).toEqual(new Set(['min-width:900']))
    expect(plan.candidates).toEqual(new Set([target]))
  })

  it('matches single-part selectors against virtual primitives without registering nodes', () => {
    const styleSheet = validateNovaUiStyleSheetSource(`
      Rect.test-bg { background: #ff0000; opacity: 0.75; }
      .unused { background: #00ff00; }
      Flex .test-bg { background: #0000ff; }
    `).styleSheet!

    const declarations = resolveNovaUiVirtualStyleDeclarations({
      type: 'Rect',
      className: 'test-bg',
    }, styleSheet, { width: 1024, height: 768 })

    expect(declarations.box?.background).toBe('#ff0000')
    expect(declarations.box?.opacity).toBe(0.75)
  })

  it('matches descendant and child selectors for virtual primitives through the owner chain', () => {
    const root = new TestStyleNode('root', 'Root', { className: 'dark' })
    const timeline = root.append(new TestStyleNode('timeline', 'TimelineChart'))
    const internalLayer = { parent: timeline }
    const styleSheet = validateNovaUiStyleSheetSource(`
      .test-bg { background: #111111; }
      .dark .test-bg { background: #ff0000; }
      TimelineChart > Rect.test-bg { opacity: 0.5; }
    `).styleSheet!

    const declarations = resolveNovaUiVirtualStyleDeclarations({
      type: 'Rect',
      className: 'test-bg',
    }, styleSheet, { width: 1024, height: 768 }, { owner: internalLayer as unknown as NovaNode<any> })

    expect(declarations.box?.background).toBe('#ff0000')
    expect(declarations.box?.opacity).toBe(0.5)
  })
})

describe('NovaCSS Raph dependency tracker', () => {
  it('collapses repeated token reads and removes stale owner subscriptions', () => {
    const observed: Array<{ path: string; phase?: string }> = []
    const disposed: Array<string> = []
    const app = { raph: { kernel: { transaction: (cb: () => void) => cb(), get: () => 0, set: () => {} } } } as unknown as NovaApp
    const owner = {
      nova: app,
      observeData(path: string, options: { phase?: string } = {}) {
        observed.push({ path, phase: options.phase })
        return () => disposed.push(path)
      },
    } as unknown as NovaNode<any>
    const tracker = new NovaUiStyleDependencyTracker()
    const tokenPath = createNovaUiStyleTokenDataPath(app, '--task-bg')

    tracker.updateOwnerDependencies(owner, [
      { token: '--task-bg', dirty: { render: true } },
      { token: '--task-bg', dirty: { render: true } },
    ])

    expect(observed).toEqual([{ path: tokenPath, phase: 'render' }])
    expect(tracker.subscriptionCount()).toBe(1)

    tracker.updateOwnerDependencies(owner, [])

    expect(disposed).toEqual([tokenPath])
    expect(tracker.subscriptionCount()).toBe(0)
  })

  it('creates app-local stylesheet atoms for virtual primitive owners', () => {
    const app = { raph: { kernel: { get: () => 0, set: () => {} } } } as unknown as NovaApp

    expect(createNovaUiStyleSheetDataPath(app)).toMatch(/^nova\.ui\.styles\.apps\.a_[a-z0-9]+\.sheet\.version$/)
    expect(createNovaUiStyleSheetDataPath(app, 'global')).toBe('nova.ui.styles.global.sheet.version')
  })
})
