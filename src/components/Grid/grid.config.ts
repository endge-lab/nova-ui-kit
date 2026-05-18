import type {
  NovaComponentCreateContext,
  NovaComponentDescriptor,
  NovaComponentNode,
  NovaComponentSchema,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  GRID_SCHEMA_TYPE,
  type GridApi,
  type GridProps,
  type GridResolvedProps,
} from '@/components/Grid/grid.types'

export type GridDescriptor = NovaComponentDescriptor<
  GridResolvedProps,
  GridApi,
  Record<string, never>,
  GridProps
>

export type GridNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<GridProps>,
) => NovaComponentNode<GridResolvedProps, GridApi, Record<string, never>, GridProps, E>

/** Описание полей Grid для schema registry и будущих редакторов. */
export const GRID_FIELD_DEFINITIONS = {
  x: { type: 'number' },
  y: { type: 'number' },
  width: { type: 'number' },
  height: { type: 'number' },
  responsive: { type: 'boolean' },
  columns: { type: 'number' },
  minColumns: { type: 'number' },
  maxColumns: { type: 'number' },
  minColumnWidth: { type: 'number' },
  gap: { type: 'number' },
  rowGap: { type: 'number' },
  columnGap: { type: 'number' },
  padding: { type: 'spacing' },
  rowHeight: { type: 'layout-value' },
  alignItems: { type: 'string' },
  justifyItems: { type: 'string' },
  style: { type: 'style' },
  background: { type: 'string' },
  clip: { type: 'boolean' },
  display: { type: 'string' },
  motion: { type: 'motion' },
  className: { type: 'string' },
  attrs: { type: 'record' },
} as const

/** Нормализует props Grid без чтения Nova runtime. */
export function normalizeGridProps(props: GridProps = {}): GridResolvedProps {
  const gap = finiteNumber(props.gap, 0)
  const columns = finiteInteger(props.columns, 1)
  const minColumns = finiteInteger(props.minColumns, 1)
  const maxColumns = Math.max(minColumns, finiteInteger(props.maxColumns, props.responsive ? 12 : columns))

  return {
    x: finiteNumber(props.x, 0),
    y: finiteNumber(props.y, 0),
    width: Math.max(0, finiteNumber(props.width, 0)),
    height: Math.max(0, finiteNumber(props.height, 0)),
    responsive: props.responsive ?? false,
    columns,
    minColumns,
    maxColumns,
    minColumnWidth: Math.max(1, finiteNumber(props.minColumnWidth, 240)),
    gap,
    rowGap: finiteNumber(props.rowGap, gap),
    columnGap: finiteNumber(props.columnGap, gap),
    padding: props.padding ?? 0,
    rowHeight: props.rowHeight ?? 'auto',
    alignItems: props.alignItems ?? 'stretch',
    justifyItems: props.justifyItems ?? 'stretch',
    style: props.style,
    background: props.background,
    border: props.border,
    clip: props.clip ?? false,
    display: props.display ?? 'normal',
    className: props.className,
    attrs: props.attrs,
  }
}

/** Создает descriptor Grid с опциональной фабрикой node. */
export function createGridDescriptor(createNode?: GridNodeFactory): GridDescriptor {
  const descriptor: GridDescriptor = {
    type: GRID_SCHEMA_TYPE,
    name: 'Grid',
    title: 'Grid layout',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: ['x', 'y'],
      update: [
        'width',
        'height',
        'responsive',
        'columns',
        'minColumns',
        'maxColumns',
        'minColumnWidth',
        'gap',
        'rowGap',
        'columnGap',
        'padding',
        'rowHeight',
        'alignItems',
        'justifyItems',
      ],
      render: [
        'style',
        'background',
        'border',
        'clip',
        'display',
        'className',
        'attrs',
      ],
    },
    fields: GRID_FIELD_DEFINITIONS,
    normalize: schema => normalizeGridProps(schema.props),
    measureBounds: (_context, schema) => {
      const props = normalizeGridProps(schema.props)
      return {
        x: props.x,
        y: props.y,
        width: props.width,
        height: props.height,
      }
    },
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

/** Descriptor без фабрики, нужен для standalone Grid node constructor. */
export const GRID_NODE_DESCRIPTOR = createGridDescriptor()

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function finiteInteger(value: number | undefined, fallback: number): number {
  return Math.max(1, Math.trunc(finiteNumber(value, fallback)))
}
