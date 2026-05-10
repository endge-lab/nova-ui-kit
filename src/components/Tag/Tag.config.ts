import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  normalizeCommonProps,
  sizeTokenHeight,
} from '@/shared/component'
import {
  TAG_SCHEMA_TYPE,
  type TagApi,
  type TagProps,
  type TagResolvedProps,
  type TagTone,
} from '@/components/Tag/Tag.types'

export type TagDescriptor = NovaComponentDescriptor<TagResolvedProps, TagApi, Record<string, never>, TagProps>

export type TagNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<TagProps>,
) => NovaComponentNode<TagResolvedProps, TagApi, Record<string, never>, TagProps, E>

export const TAG_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  text: { type: 'string' },
  icon: { type: 'icon' },
  tone: { type: 'string' },
  size: { type: 'string' },
  selected: { type: 'boolean' },
} as const

export function normalizeTagProps(props: TagProps = {}): TagResolvedProps {
  const tone = props.tone ?? 'neutral'
  const size = props.size ?? 'md'
  return {
    ...normalizeCommonProps(props, resolveTagDefaults(tone, size, props.selected ?? false)),
    text: props.text ?? '',
    icon: props.icon,
    tone,
    size,
    selected: props.selected ?? false,
  }
}

export function createTagDescriptor(createNode?: TagNodeFactory): TagDescriptor {
  const descriptor: TagDescriptor = {
    type: TAG_SCHEMA_TYPE,
    name: 'Tag',
    title: 'Tag',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'text', 'icon', 'size'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'tone', 'selected'],
    },
    fields: TAG_FIELD_DEFINITIONS,
    normalize: schema => normalizeTagProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeTagProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const TAG_NODE_DESCRIPTOR = createTagDescriptor()

function resolveTagDefaults(tone: TagTone, size: TagResolvedProps['size'], selected: boolean) {
  const tones = {
    neutral: ['#f8fafc', '#475569', '#cbd5e1'],
    info: ['#eff6ff', '#1d4ed8', '#bfdbfe'],
    success: ['#ecfdf5', '#047857', '#a7f3d0'],
    warning: ['#fffbeb', '#b45309', '#fde68a'],
    danger: ['#fef2f2', '#b91c1c', '#fecaca'],
  } satisfies Record<TagTone, [string, string, string]>
  const [background, color, border] = tones[tone]
  return {
    width: 92,
    height: sizeTokenHeight(size, 28),
    background: selected ? color : background,
    color: selected ? '#ffffff' : color,
    border: { color: border, width: 1, radius: 999 },
    padding: { horizontal: 10, vertical: 4 },
  }
}
