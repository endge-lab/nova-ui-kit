import type {
  NovaComponentCreateContext,
  NovaComponentDescriptor,
  NovaComponentNode,
  NovaComponentSchema,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  FLEX_SCHEMA_TYPE,
  type FlexApi,
  type FlexProps,
  type FlexResolvedProps,
} from '@/components/Flex/types'

export type FlexDescriptor = NovaComponentDescriptor<
  FlexResolvedProps,
  FlexApi,
  Record<string, never>,
  FlexProps
>

export type FlexNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<FlexProps>,
) => NovaComponentNode<FlexResolvedProps, FlexApi, Record<string, never>, FlexProps, E>

/** Описание полей Flex для schema registry и будущих редакторов. */
export const FLEX_FIELD_DEFINITIONS = {
  x: { type: 'number' },
  y: { type: 'number' },
  width: { type: 'number' },
  height: { type: 'number' },
  direction: { type: 'string' },
  wrap: { type: 'string' },
  gap: { type: 'number' },
  rowGap: { type: 'number' },
  columnGap: { type: 'number' },
  padding: { type: 'spacing' },
  justifyContent: { type: 'string' },
  alignItems: { type: 'string' },
  style: { type: 'style' },
  background: { type: 'string' },
  clip: { type: 'boolean' },
  motion: { type: 'motion' },
  className: { type: 'string' },
  attrs: { type: 'record' },
} as const

/** Нормализует props Flex без чтения Nova runtime. */
export function normalizeFlexProps(props: FlexProps = {}): FlexResolvedProps {
  const gap = finiteNumber(props.gap, 0)

  return {
    x: finiteNumber(props.x, 0),
    y: finiteNumber(props.y, 0),
    width: Math.max(0, finiteNumber(props.width, 0)),
    height: Math.max(0, finiteNumber(props.height, 0)),
    direction: props.direction ?? 'row',
    wrap: props.wrap ?? 'nowrap',
    gap,
    rowGap: finiteNumber(props.rowGap, gap),
    columnGap: finiteNumber(props.columnGap, gap),
    padding: props.padding ?? 0,
    justifyContent: props.justifyContent ?? 'start',
    alignItems: props.alignItems ?? 'stretch',
    style: props.style,
    background: props.background,
    border: props.border,
    clip: props.clip ?? false,
    className: props.className,
    attrs: props.attrs,
  }
}

/** Создает descriptor Flex с опциональной фабрикой node. */
export function createFlexDescriptor(createNode?: FlexNodeFactory): FlexDescriptor {
  const descriptor: FlexDescriptor = {
    type: FLEX_SCHEMA_TYPE,
    name: 'Flex',
    title: 'Flex layout',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: ['x', 'y'],
      update: [
        'width',
        'height',
        'direction',
        'wrap',
        'gap',
        'rowGap',
        'columnGap',
        'padding',
        'justifyContent',
        'alignItems',
      ],
      render: [
        'style',
        'background',
        'border',
        'clip',
        'className',
        'attrs',
      ],
    },
    fields: FLEX_FIELD_DEFINITIONS,
    normalize: schema => normalizeFlexProps(schema.props),
    measureBounds: (_context, schema) => {
      const props = normalizeFlexProps(schema.props)
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

/** Descriptor без фабрики, нужен для standalone Flex node constructor. */
export const FLEX_NODE_DESCRIPTOR = createFlexDescriptor()

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
