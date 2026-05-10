import type {
  NovaComponentCreateContext,
  NovaComponentDescriptor,
  NovaComponentNode,
  NovaComponentSchema,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import { normalizeTextBlockProps } from '@/components/TextBlock/TextBlockLayout'
import { buildTextBlockSchema } from '@/components/TextBlock/TextBlock.schema'
import {
  TEXT_BLOCK_SCHEMA_TYPE,
  type TextBlockApi,
  type TextBlockProps,
  type TextBlockResolvedProps,
} from '@/components/TextBlock/TextBlock.types'
import { measureNovaUiTextWidth } from '@/shared/layout'

export type TextBlockDescriptor = NovaComponentDescriptor<
  TextBlockResolvedProps,
  TextBlockApi,
  Record<string, never>,
  TextBlockProps
>

export type TextBlockNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<TextBlockProps>,
) => NovaComponentNode<TextBlockResolvedProps, TextBlockApi, Record<string, never>, TextBlockProps, E>

export const TEXT_BLOCK_LAYOUT_DIRTY_KEYS: ReadonlyArray<keyof TextBlockResolvedProps> = [
  'text',
  'width',
  'height',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'padding',
  'whiteSpace',
  'overflow',
  'maxLines',
  'wordBreak',
  'align',
  'verticalAlign',
]

export const TEXT_BLOCK_RENDER_DIRTY_KEYS: ReadonlyArray<keyof TextBlockResolvedProps> = [
  'color',
  'opacity',
  'background',
  'border',
  'style',
]

export const TEXT_BLOCK_FIELD_DEFINITIONS = {
  text: { type: 'string' },
  x: { type: 'number' },
  y: { type: 'number' },
  width: { type: 'number' },
  height: { type: 'number' },
  color: { type: 'string' },
  fontSize: { type: 'number' },
  fontWeight: { type: 'string' },
  fontStyle: { type: 'string' },
  lineHeight: { type: 'number' },
  align: { type: 'string' },
  verticalAlign: { type: 'string' },
  whiteSpace: { type: 'string' },
  overflow: { type: 'string' },
  maxLines: { type: 'number' },
  wordBreak: { type: 'string' },
  style: { type: 'style' },
  motion: { type: 'motion' },
  className: { type: 'string' },
  attrs: { type: 'record' },
} as const

export function createTextBlockDescriptor(createNode?: TextBlockNodeFactory): TextBlockDescriptor {
  const descriptor: TextBlockDescriptor = {
    type: TEXT_BLOCK_SCHEMA_TYPE,
    name: 'TextBlock',
    title: 'Text block',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: ['x', 'y'],
      update: TEXT_BLOCK_LAYOUT_DIRTY_KEYS,
      render: TEXT_BLOCK_RENDER_DIRTY_KEYS,
    },
    fields: TEXT_BLOCK_FIELD_DEFINITIONS,
    normalize: schema => normalizeTextBlockProps(schema.props),
    renderSchema: (_context, schema) => buildTextBlockSchema(
      normalizeTextBlockProps(schema.props),
      (text, options) => measureNovaUiTextWidth(text, options),
      'schema',
    ),
    measureBounds: (_context, schema) => {
      const props = normalizeTextBlockProps(schema.props)
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

export const TEXT_BLOCK_NODE_DESCRIPTOR = createTextBlockDescriptor()
