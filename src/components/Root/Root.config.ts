import type {
  NovaComponentCreateContext,
  NovaComponentDescriptor,
  NovaComponentNode,
  NovaComponentSchema,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  ROOT_SCHEMA_TYPE,
  type RootApi,
  type RootProps,
  type RootResolvedProps,
} from '@/components/Root/root.types'

export type RootDescriptor = NovaComponentDescriptor<
  RootResolvedProps,
  RootApi,
  Record<string, never>,
  RootProps
>

export type RootNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<RootProps>,
) => NovaComponentNode<RootResolvedProps, RootApi, Record<string, never>, RootProps, E>

/** Описание полей Root для schema registry и будущих редакторов. */
export const ROOT_FIELD_DEFINITIONS = {
  x: { type: 'number' },
  y: { type: 'number' },
  width: { type: 'number' },
  height: { type: 'number' },
  padding: { type: 'spacing' },
  style: { type: 'style' },
  styleSheet: { type: 'stylesheet' },
  background: { type: 'string' },
  border: { type: 'border' },
  clip: { type: 'boolean' },
  display: { type: 'string' },
  cursor: { type: 'cursor' },
  cursorContext: { type: 'record' },
  className: { type: 'string' },
  attrs: { type: 'record' },
} as const

/** Нормализует props Root без чтения Nova runtime. */
export function normalizeRootProps(props: RootProps = {}): RootResolvedProps {
  return {
    x: finiteNumber(props.x, 0),
    y: finiteNumber(props.y, 0),
    width: Math.max(0, finiteNumber(props.width, 0)),
    height: Math.max(0, finiteNumber(props.height, 0)),
    padding: props.padding ?? 0,
    style: props.style,
    styleSheet: props.styleSheet ?? '',
    background: props.background,
    border: props.border,
    clip: props.clip ?? false,
    display: props.display ?? 'normal',
    cursor: props.cursor,
    cursorContext: props.cursorContext,
    className: props.className,
    attrs: props.attrs,
  }
}

/** Создает descriptor Root с опциональной фабрикой node. */
export function createRootDescriptor(createNode?: RootNodeFactory): RootDescriptor {
  const descriptor: RootDescriptor = {
    type: ROOT_SCHEMA_TYPE,
    name: 'Root',
    title: 'Nova UI Kit Root',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: ['x', 'y'],
      update: [
        'width',
        'height',
        'padding',
      ],
      render: [
        'style',
        'styleSheet',
        'background',
        'border',
        'clip',
        'display',
        'cursor',
        'cursorContext',
        'className',
        'attrs',
      ],
    },
    fields: ROOT_FIELD_DEFINITIONS,
    normalize: schema => normalizeRootProps(schema.props),
    measureBounds: (_context, schema) => {
      const props = normalizeRootProps(schema.props)
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

/** Descriptor без фабрики, нужен для standalone Root node constructor. */
export const ROOT_NODE_DESCRIPTOR = createRootDescriptor()

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
