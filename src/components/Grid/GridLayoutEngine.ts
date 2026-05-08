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
  GridAlign,
  GridChildLayout,
  GridResolvedProps,
} from '@/components/Grid/types'

interface CompiledGridChildLayout {
  colSpan: number
  height: NovaUiCompiledLayoutValue
  minHeight: number
  maxHeight: number
  margin: NovaUiResolvedSpacing
  alignSelf?: GridAlign
  justifySelf?: GridAlign
  order: number
}

export interface GridChildEntry {
  id: string
  node: NovaNode<any>
  rawLayout: GridChildLayout
  compiledLayout: CompiledGridChildLayout
  prevRect: NovaUiLayoutRect
  nextRect: NovaUiLayoutRect
}

interface GridMeasuredItem {
  entry: GridChildEntry
  row: number
  column: number
  colSpan: number
  cellX: number
  cellWidth: number
  preferredWidth: number
  preferredHeight: number
  margin: NovaUiResolvedSpacing
  alignSelf?: GridAlign
  justifySelf?: GridAlign
}

export interface GridLayoutContext {
  props: GridResolvedProps
  width: number
  height: number
  entries: GridChildEntry[]
}

export interface GridLayoutResult {
  columnCount: number
  rowCount: number
}

/** Компилирует layout ребенка Grid, чтобы update работал с числами. */
export function compileGridChildLayout(layout: GridChildLayout = {}): CompiledGridChildLayout {
  return {
    colSpan: Math.max(1, Math.trunc(layout.colSpan ?? 1)),
    height: compileLayoutValue(layout.height, 'auto'),
    minHeight: clampLayoutNumber(layout.minHeight ?? 0),
    maxHeight: finiteMax(layout.maxHeight),
    margin: resolveSpacing(layout.margin),
    alignSelf: layout.alignSelf,
    justifySelf: layout.justifySelf,
    order: Math.trunc(layout.order ?? 0),
  }
}

/** Считает rect детей Grid без создания Nova nodes и без render side effects. */
export class GridLayoutEngine {
  private readonly sortedEntries: GridChildEntry[] = []
  private readonly measuredItems: GridMeasuredItem[] = []
  private readonly rowHeights: number[] = []
  private readonly rowOffsets: number[] = []

  compute(context: GridLayoutContext): GridLayoutResult {
    const props = context.props
    const padding = resolveSpacing(props.padding)
    const innerWidth = Math.max(0, context.width - padding.left - padding.right)
    const innerHeight = Math.max(0, context.height - padding.top - padding.bottom)
    const columnCount = this.resolveColumnCount(props, innerWidth)
    const columnWidth = this.resolveColumnWidth(innerWidth, columnCount, props.columnGap)
    const rowHeight = compileLayoutValue(props.rowHeight, 'auto')

    this.prepareSortedEntries(context.entries)
    this.collectMeasuredItems({
      props,
      padding,
      innerHeight,
      columnCount,
      columnWidth,
      rowHeight,
    })
    this.placeMeasuredItems({
      props,
      padding,
      columnWidth,
      columnGap: props.columnGap,
    })

    return {
      columnCount,
      rowCount: this.rowHeights.length,
    }
  }

  private prepareSortedEntries(entries: GridChildEntry[]): void {
    this.sortedEntries.length = 0
    if (isAlreadyOrdered(entries)) {
      this.sortedEntries.push(...entries)
      return
    }

    this.sortedEntries.push(...entries)
    this.sortedEntries.sort((a, b) => {
      const orderDiff = a.compiledLayout.order - b.compiledLayout.order
      if (orderDiff !== 0) return orderDiff
      return 0
    })
  }

  private collectMeasuredItems(context: {
    props: GridResolvedProps
    padding: NovaUiResolvedSpacing
    innerHeight: number
    columnCount: number
    columnWidth: number
    rowHeight: NovaUiCompiledLayoutValue
  }): void {
    this.rowHeights.length = 0

    let row = 0
    let column = 0
    let itemIndex = 0

    for (const entry of this.sortedEntries) {
      const layout = entry.compiledLayout
      const colSpan = Math.min(context.columnCount, layout.colSpan)

      if (column > 0 && column + colSpan > context.columnCount) {
        row += 1
        column = 0
      }

      const cellX = context.padding.left + column * (context.columnWidth + context.props.columnGap)
      const cellWidth = colSpan * context.columnWidth + Math.max(0, colSpan - 1) * context.props.columnGap
      const preferredHeight = this.resolveItemHeight(entry, context.rowHeight, cellWidth, context.innerHeight)
      const outerHeight = preferredHeight + layout.margin.top + layout.margin.bottom
      const item = this.measuredItems[itemIndex] ?? createMeasuredItem()

      this.rowHeights[row] = Math.max(this.rowHeights[row] ?? 0, outerHeight)
      item.entry = entry
      item.row = row
      item.column = column
      item.colSpan = colSpan
      item.cellX = cellX
      item.cellWidth = cellWidth
      item.preferredWidth = Math.max(0, cellWidth - layout.margin.left - layout.margin.right)
      item.preferredHeight = preferredHeight
      item.margin = layout.margin
      item.alignSelf = layout.alignSelf
      item.justifySelf = layout.justifySelf
      this.measuredItems[itemIndex] = item
      itemIndex += 1

      column += colSpan
      if (column >= context.columnCount) {
        row += 1
        column = 0
      }
    }

    this.measuredItems.length = itemIndex
  }

  private placeMeasuredItems(context: {
    props: GridResolvedProps
    padding: NovaUiResolvedSpacing
    columnWidth: number
    columnGap: number
  }): void {
    this.resolveRowOffsets(context.props.rowGap)

    for (const item of this.measuredItems) {
      const rowY = context.padding.top + this.rowOffsets[item.row]
      const rowHeight = this.rowHeights[item.row] ?? 0
      const align = item.alignSelf ?? context.props.alignItems
      const justify = item.justifySelf ?? context.props.justifyItems
      const innerCellWidth = Math.max(0, item.cellWidth - item.margin.left - item.margin.right)
      const innerRowHeight = Math.max(0, rowHeight - item.margin.top - item.margin.bottom)
      const targetWidth = justify === 'stretch' ? innerCellWidth : Math.min(item.preferredWidth, innerCellWidth)
      const targetHeight = align === 'stretch' ? innerRowHeight : Math.min(item.preferredHeight, innerRowHeight)
      const xOffset = this.resolveOffset(justify, innerCellWidth, targetWidth)
      const yOffset = this.resolveOffset(align, innerRowHeight, targetHeight)
      const rect = item.entry.nextRect

      rect.x = item.cellX + item.margin.left + xOffset
      rect.y = rowY + item.margin.top + yOffset
      rect.width = targetWidth
      rect.height = targetHeight
    }
  }

  private resolveColumnCount(props: GridResolvedProps, innerWidth: number): number {
    if (!props.responsive) return Math.max(1, props.columns)

    const rawColumns = Math.max(
      1,
      Math.floor((innerWidth + props.columnGap) / (props.minColumnWidth + props.columnGap)),
    )

    return Math.max(
      props.minColumns,
      Math.min(props.maxColumns, rawColumns),
    )
  }

  private resolveColumnWidth(innerWidth: number, columnCount: number, columnGap: number): number {
    const gapTotal = Math.max(0, columnCount - 1) * columnGap
    return Math.max(0, (innerWidth - gapTotal) / columnCount)
  }

  private resolveItemHeight(
    entry: GridChildEntry,
    rowHeight: NovaUiCompiledLayoutValue,
    cellWidth: number,
    innerHeight: number,
  ): number {
    const layout = entry.compiledLayout
    const measured = this.measureAutoItem(entry, cellWidth, innerHeight)
    const rawHeight = !isAutoLayoutValue(layout.height)
      ? resolveLayoutValue(layout.height, innerHeight, 0)
      : !isAutoLayoutValue(rowHeight)
        ? resolveLayoutValue(rowHeight, innerHeight, 0)
        : measured?.height ?? entry.node.height

    return clampLayoutNumber(rawHeight, layout.minHeight, layout.maxHeight)
  }

  private measureAutoItem(entry: GridChildEntry, cellWidth: number, innerHeight: number): { width: number; height: number } | undefined {
    const layout = entry.compiledLayout

    if (!isAutoLayoutValue(layout.height)) return undefined
    if (!isNovaUiLayoutTarget(entry.node) || !entry.node.measureLayout) return undefined

    return entry.node.measureLayout({
      minWidth: 0,
      maxWidth: cellWidth,
      minHeight: layout.minHeight,
      maxHeight: Math.min(layout.maxHeight, innerHeight),
    })
  }

  private resolveRowOffsets(rowGap: number): void {
    this.rowOffsets.length = this.rowHeights.length
    let offset = 0

    for (let index = 0; index < this.rowHeights.length; index += 1) {
      this.rowOffsets[index] = offset
      offset += (this.rowHeights[index] ?? 0) + rowGap
    }
  }

  private resolveOffset(align: GridAlign, available: number, target: number): number {
    const free = Math.max(0, available - target)
    if (align === 'center') return free / 2
    if (align === 'end') return free
    return 0
  }
}

/** Создает entry ребенка Grid с compiled layout и reusable rects. */
export function createGridChildEntry(
  id: string,
  node: NovaNode<any>,
  layout: GridChildLayout = {},
): GridChildEntry {
  return {
    id,
    node,
    rawLayout: layout,
    compiledLayout: compileGridChildLayout(layout),
    prevRect: createLayoutRect(),
    nextRect: createLayoutRect(),
  }
}

function finiteMax(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : Number.POSITIVE_INFINITY
}

function createMeasuredItem(): GridMeasuredItem {
  return {
    entry: undefined as unknown as GridChildEntry,
    row: 0,
    column: 0,
    colSpan: 1,
    cellX: 0,
    cellWidth: 0,
    preferredWidth: 0,
    preferredHeight: 0,
    margin: { left: 0, right: 0, top: 0, bottom: 0 },
  }
}

function isAlreadyOrdered(entries: GridChildEntry[]): boolean {
  let previousOrder = Number.NEGATIVE_INFINITY

  for (const entry of entries) {
    const order = entry.compiledLayout.order
    if (order < previousOrder) return false
    previousOrder = order
  }

  return true
}
