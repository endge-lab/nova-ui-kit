import type { NovaNode } from '@endge/nova'
import {
  clampLayoutNumber,
  compileLayoutValue,
  createLayoutRect,
  isAutoLayoutValue,
  isNovaUiLayoutTarget,
  resolveLayoutValue,
  resolveSpacing,
  type NovaUiCompiledLayoutValue,
  type NovaUiLayoutRect,
  type NovaUiResolvedSpacing,
} from '@/shared/layout'
import type {
  FlexAlign,
  FlexChildLayout,
  FlexResolvedProps,
} from '@/components/Flex/types'

interface AxisSpacing {
  mainStart: number
  mainEnd: number
  crossStart: number
  crossEnd: number
}

interface CompiledFlexChildLayout {
  width: NovaUiCompiledLayoutValue
  height: NovaUiCompiledLayoutValue
  flexBasis: NovaUiCompiledLayoutValue
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
  flexGrow: number
  flexShrink: number
  margin: NovaUiResolvedSpacing
  alignSelf?: FlexAlign
  order: number
}

export interface FlexChildEntry {
  id: string
  node: NovaNode<any>
  rawLayout: FlexChildLayout
  compiledLayout: CompiledFlexChildLayout
  prevRect: NovaUiLayoutRect
  nextRect: NovaUiLayoutRect
}

interface FlexMeasuredItem {
  entry: FlexChildEntry
  main: number
  cross: number
  outerMain: number
  outerCross: number
  targetMain: number
  targetCross: number
  minMain: number
  maxMain: number
  minCross: number
  maxCross: number
  flexGrow: number
  flexShrink: number
  margin: AxisSpacing
  alignSelf?: FlexAlign
}

interface FlexLine {
  items: FlexMeasuredItem[]
  main: number
  cross: number
  totalGrow: number
  totalShrink: number
}

export interface FlexLayoutContext {
  props: FlexResolvedProps
  width: number
  height: number
  entries: FlexChildEntry[]
}

/** Компилирует layout ребенка, чтобы update работал только с числами и enum. */
export function compileFlexChildLayout(layout: FlexChildLayout = {}): CompiledFlexChildLayout {
  return {
    width: compileLayoutValue(layout.width, 'auto'),
    height: compileLayoutValue(layout.height, 'auto'),
    flexBasis: compileLayoutValue(layout.flexBasis, 'auto'),
    minWidth: clampLayoutNumber(layout.minWidth ?? 0),
    maxWidth: finiteMax(layout.maxWidth),
    minHeight: clampLayoutNumber(layout.minHeight ?? 0),
    maxHeight: finiteMax(layout.maxHeight),
    flexGrow: clampLayoutNumber(layout.flexGrow ?? 0),
    flexShrink: clampLayoutNumber(layout.flexShrink ?? 1),
    margin: resolveSpacing(layout.margin),
    alignSelf: layout.alignSelf,
    order: Math.trunc(layout.order ?? 0),
  }
}

/** Считает rect детей Flex без создания Nova nodes и без render side effects. */
export class FlexLayoutEngine {
  private readonly sortedEntries: FlexChildEntry[] = []
  private readonly lines: FlexLine[] = []

  compute(context: FlexLayoutContext): void {
    const props = context.props
    const padding = resolveSpacing(props.padding)
    const innerWidth = Math.max(0, context.width - padding.left - padding.right)
    const innerHeight = Math.max(0, context.height - padding.top - padding.bottom)
    const isRow = props.direction === 'row'
    const mainSize = isRow ? innerWidth : innerHeight
    const crossSize = isRow ? innerHeight : innerWidth
    const mainGap = isRow ? props.columnGap : props.rowGap
    const crossGap = isRow ? props.rowGap : props.columnGap

    this.prepareSortedEntries(context.entries)
    this.collectLines({
      entries: this.sortedEntries,
      props,
      isRow,
      mainSize,
      crossSize,
      mainGap,
    })
    this.placeLines({
      props,
      padding,
      isRow,
      mainSize,
      crossSize,
      mainGap,
      crossGap,
    })
  }

  private prepareSortedEntries(entries: FlexChildEntry[]): void {
    this.sortedEntries.length = 0
    this.sortedEntries.push(...entries)
    this.sortedEntries.sort((a, b) => {
      const orderDiff = a.compiledLayout.order - b.compiledLayout.order
      if (orderDiff !== 0) return orderDiff
      return 0
    })
  }

  private collectLines(context: {
    entries: FlexChildEntry[]
    props: FlexResolvedProps
    isRow: boolean
    mainSize: number
    crossSize: number
    mainGap: number
  }): void {
    this.lines.length = 0
    let line = createLine()

    for (const entry of context.entries) {
      const item = this.measureItem(entry, context.mainSize, context.crossSize, context.isRow, context.props.alignItems)
      const nextMain = line.items.length === 0
        ? item.outerMain
        : line.main + context.mainGap + item.outerMain

      if (context.props.wrap === 'wrap' && line.items.length > 0 && nextMain > context.mainSize) {
        this.lines.push(line)
        line = createLine()
      }

      line.items.push(item)
      line.main = line.items.length === 1 ? item.outerMain : line.main + context.mainGap + item.outerMain
      line.cross = Math.max(line.cross, item.outerCross)
      line.totalGrow += item.flexGrow
      line.totalShrink += item.flexShrink
    }

    if (line.items.length > 0) this.lines.push(line)
  }

  private measureItem(
    entry: FlexChildEntry,
    mainSize: number,
    crossSize: number,
    isRow: boolean,
    parentAlign: FlexAlign,
  ): FlexMeasuredItem {
    const layout = entry.compiledLayout
    const margin = resolveAxisSpacing(layout.margin, isRow)
    const widthFallback = entry.node.width
    const heightFallback = entry.node.height
    const measured = this.measureAutoItem(entry, mainSize, crossSize, isRow)
    const rawMain = this.resolveMain(layout, mainSize, isRow, widthFallback, heightFallback, measured)
    const rawCross = this.resolveCross(layout, crossSize, isRow, widthFallback, heightFallback, measured)
    const minMain = isRow ? layout.minWidth : layout.minHeight
    const maxMain = isRow ? layout.maxWidth : layout.maxHeight
    const minCross = isRow ? layout.minHeight : layout.minWidth
    const maxCross = isRow ? layout.maxHeight : layout.maxWidth
    const main = clampLayoutNumber(rawMain, minMain, maxMain)
    const align = layout.alignSelf ?? parentAlign
    const cross = align === 'stretch' && rawCross === 0
      ? 0
      : clampLayoutNumber(rawCross, minCross, maxCross)

    return {
      entry,
      main,
      cross,
      outerMain: main + margin.mainStart + margin.mainEnd,
      outerCross: cross + margin.crossStart + margin.crossEnd,
      targetMain: main,
      targetCross: cross,
      minMain,
      maxMain,
      minCross,
      maxCross,
      flexGrow: layout.flexGrow,
      flexShrink: layout.flexShrink,
      margin,
      alignSelf: layout.alignSelf,
    }
  }

  private resolveMain(
    layout: CompiledFlexChildLayout,
    available: number,
    isRow: boolean,
    widthFallback: number,
    heightFallback: number,
    measured: { width: number; height: number } | undefined,
  ): number {
    if (!isAutoLayoutValue(layout.flexBasis)) {
      return resolveLayoutValue(layout.flexBasis, available, 0)
    }

    const value = isRow ? layout.width : layout.height
    const fallback = measured
      ? isRow ? measured.width : measured.height
      : isRow ? widthFallback : heightFallback
    return resolveLayoutValue(value, available, fallback)
  }

  private resolveCross(
    layout: CompiledFlexChildLayout,
    available: number,
    isRow: boolean,
    widthFallback: number,
    heightFallback: number,
    measured: { width: number; height: number } | undefined,
  ): number {
    const value = isRow ? layout.height : layout.width
    const fallback = measured
      ? isRow ? measured.height : measured.width
      : isRow ? heightFallback : widthFallback
    return resolveLayoutValue(value, available, fallback)
  }

  private measureAutoItem(entry: FlexChildEntry, mainSize: number, crossSize: number, isRow: boolean): { width: number; height: number } | undefined {
    const layout = entry.compiledLayout
    const mainValue = isRow ? layout.width : layout.height
    const crossValue = isRow ? layout.height : layout.width
    const needsMainMeasure = isAutoLayoutValue(layout.flexBasis) && isAutoLayoutValue(mainValue)
    const needsCrossMeasure = isAutoLayoutValue(crossValue)

    if (!needsMainMeasure && !needsCrossMeasure) return undefined
    if (!isNovaUiLayoutTarget(entry.node) || !entry.node.measureLayout) return undefined

    return entry.node.measureLayout({
      minWidth: layout.minWidth,
      maxWidth: Math.min(layout.maxWidth, isRow ? mainSize : crossSize),
      minHeight: layout.minHeight,
      maxHeight: Math.min(layout.maxHeight, isRow ? crossSize : mainSize),
    })
  }

  private placeLines(context: {
    props: FlexResolvedProps
    padding: NovaUiResolvedSpacing
    isRow: boolean
    mainSize: number
    crossSize: number
    mainGap: number
    crossGap: number
  }): void {
    let crossCursor = context.isRow ? context.padding.top : context.padding.left

    for (const line of this.lines) {
      this.resolveLineMainSizes(line, context.mainSize)
      this.resolveLineCrossSizes(line, context.props.alignItems)
      this.placeLine(line, context, crossCursor)
      crossCursor += line.cross + context.crossGap
    }
  }

  private resolveLineMainSizes(line: FlexLine, mainSize: number): void {
    const free = mainSize - line.main

    if (free > 0 && line.totalGrow > 0) {
      for (const item of line.items) {
        item.targetMain = clampLayoutNumber(
          item.main + free * (item.flexGrow / line.totalGrow),
          item.minMain,
          item.maxMain,
        )
      }
      return
    }

    if (free < 0 && line.totalShrink > 0) {
      const shrinkBase = line.items.reduce((sum, item) => sum + item.main * item.flexShrink, 0)
      for (const item of line.items) {
        const share = shrinkBase > 0 ? (item.main * item.flexShrink) / shrinkBase : 0
        item.targetMain = clampLayoutNumber(
          item.main + free * share,
          item.minMain,
          item.maxMain,
        )
      }
    }
  }

  private resolveLineCrossSizes(line: FlexLine, parentAlign: FlexAlign): void {
    for (const item of line.items) {
      const align = item.alignSelf ?? parentAlign
      if (align !== 'stretch') continue

      item.targetCross = clampLayoutNumber(
        Math.max(0, line.cross - item.margin.crossStart - item.margin.crossEnd),
        item.minCross,
        item.maxCross,
      )
    }
  }

  private placeLine(
    line: FlexLine,
    context: {
      props: FlexResolvedProps
      padding: NovaUiResolvedSpacing
      isRow: boolean
      mainSize: number
      mainGap: number
    },
    crossCursor: number,
  ): void {
    const baseGapTotal = Math.max(0, line.items.length - 1) * context.mainGap
    const usedMain = line.items.reduce((sum, item) => (
      sum + item.targetMain + item.margin.mainStart + item.margin.mainEnd
    ), baseGapTotal)
    const freeMain = Math.max(0, context.mainSize - usedMain)
    const gap = this.resolveJustifiedGap(context.props.justifyContent, context.mainGap, freeMain, line.items.length)
    let mainCursor = this.resolveJustifiedStart(context.props.justifyContent, freeMain)

    for (const item of line.items) {
      mainCursor += item.margin.mainStart

      const align = item.alignSelf ?? context.props.alignItems
      const crossOffset = this.resolveCrossOffset(align, line.cross, item.targetCross, item.margin)
      const rect = item.entry.nextRect

      if (context.isRow) {
        rect.x = context.padding.left + mainCursor
        rect.y = crossCursor + crossOffset
        rect.width = item.targetMain
        rect.height = item.targetCross
      } else {
        rect.x = crossCursor + crossOffset
        rect.y = context.padding.top + mainCursor
        rect.width = item.targetCross
        rect.height = item.targetMain
      }

      mainCursor += item.targetMain + item.margin.mainEnd + gap
    }
  }

  private resolveJustifiedStart(justify: FlexResolvedProps['justifyContent'], freeMain: number): number {
    if (justify === 'center') return freeMain / 2
    if (justify === 'end') return freeMain
    return 0
  }

  private resolveJustifiedGap(
    justify: FlexResolvedProps['justifyContent'],
    baseGap: number,
    freeMain: number,
    count: number,
  ): number {
    if (justify === 'space-between' && count > 1) {
      return baseGap + freeMain / (count - 1)
    }
    return baseGap
  }

  private resolveCrossOffset(
    align: FlexAlign,
    lineCross: number,
    itemCross: number,
    margin: AxisSpacing,
  ): number {
    const free = Math.max(0, lineCross - itemCross - margin.crossStart - margin.crossEnd)
    if (align === 'center') return margin.crossStart + free / 2
    if (align === 'end') return margin.crossStart + free
    return margin.crossStart
  }
}

/** Создает entry ребенка Flex с compiled layout и reusable rects. */
export function createFlexChildEntry(
  id: string,
  node: NovaNode<any>,
  layout: FlexChildLayout = {},
): FlexChildEntry {
  return {
    id,
    node,
    rawLayout: layout,
    compiledLayout: compileFlexChildLayout(layout),
    prevRect: createLayoutRect(),
    nextRect: createLayoutRect(),
  }
}

function createLine(): FlexLine {
  return {
    items: [],
    main: 0,
    cross: 0,
    totalGrow: 0,
    totalShrink: 0,
  }
}

function resolveAxisSpacing(spacing: NovaUiResolvedSpacing, isRow: boolean): AxisSpacing {
  return isRow
    ? {
        mainStart: spacing.left,
        mainEnd: spacing.right,
        crossStart: spacing.top,
        crossEnd: spacing.bottom,
      }
    : {
        mainStart: spacing.top,
        mainEnd: spacing.bottom,
        crossStart: spacing.left,
        crossEnd: spacing.right,
      }
}

function finiteMax(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : Number.POSITIVE_INFINITY
}
