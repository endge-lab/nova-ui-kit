import type {
  NovaComponentCreateContext,
  NovaComponentDescriptor,
  NovaComponentNode,
  NovaComponentSchema,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  normalizeCommonProps,
  sizeTokenHeight,
} from '@/shared/component'
import {
  BADGE_SCHEMA_TYPE,
  type BadgeApi,
  type BadgeProps,
  type BadgeResolvedProps,
  type BadgeTone,
} from '@/components/Badge/badge.types'

export type BadgeDescriptor = NovaComponentDescriptor<
  BadgeResolvedProps,
  BadgeApi,
  Record<string, never>,
  BadgeProps
>

export type BadgeNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<BadgeProps>,
) => NovaComponentNode<BadgeResolvedProps, BadgeApi, Record<string, never>, BadgeProps, E>

export const BADGE_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  text: { type: 'string' },
  value: { type: 'any' },
  max: { type: 'number' },
  dot: { type: 'boolean' },
  icon: { type: 'icon' },
  tone: { type: 'string' },
  size: { type: 'string' },
  anchor: { type: 'record' },
  placement: { type: 'string' },
  offsetX: { type: 'number' },
  offsetY: { type: 'number' },
} as const

export function normalizeBadgeProps(props: BadgeProps = {}): BadgeResolvedProps {
  const tone = props.tone ?? 'info'
  const size = props.size ?? 'sm'
  const common = normalizeCommonProps(props, resolveBadgeDefaults(tone, size, props.dot ?? false))

  return {
    ...common,
    text: props.text ?? '',
    value: props.value,
    max: Math.max(1, finiteNumber(props.max, 99)),
    dot: props.dot ?? false,
    icon: props.icon,
    tone,
    size,
    anchor: props.anchor,
    placement: props.placement ?? 'top-end',
    offsetX: finiteNumber(props.offsetX, 0),
    offsetY: finiteNumber(props.offsetY, 0),
  }
}

export function createBadgeDescriptor(createNode?: BadgeNodeFactory): BadgeDescriptor {
  const descriptor: BadgeDescriptor = {
    type: BADGE_SCHEMA_TYPE,
    name: 'Badge',
    title: 'Badge',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'text', 'value', 'max', 'dot', 'icon', 'size', 'anchor', 'placement', 'offsetX', 'offsetY'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'tone'],
    },
    fields: BADGE_FIELD_DEFINITIONS,
    normalize: schema => normalizeBadgeProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeBadgeProps),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const BADGE_NODE_DESCRIPTOR = createBadgeDescriptor()

function resolveBadgeDefaults(tone: BadgeTone, size: BadgeResolvedProps['size'], dot: boolean) {
  const palette = badgePalette(tone)
  const height = dot ? 9 : sizeTokenHeight(size, 20)
  return {
    width: dot ? 9 : size === 'lg' ? 32 : size === 'md' ? 28 : 22,
    height,
    background: palette.background,
    color: palette.color,
    border: { color: palette.border, width: 1, radius: 999 },
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: size === 'lg' ? 12 : size === 'md' ? 11 : 10,
    fontWeight: '800' as const,
    lineHeight: size === 'lg' ? 16 : 14,
  }
}

function badgePalette(tone: BadgeTone): { background: string; border: string; color: string } {
  if (tone === 'success') return { background: '#dcfce7', border: '#86efac', color: '#166534' }
  if (tone === 'warning') return { background: '#fef3c7', border: '#fcd34d', color: '#92400e' }
  if (tone === 'danger') return { background: '#fee2e2', border: '#fca5a5', color: '#991b1b' }
  if (tone === 'neutral') return { background: '#f1f5f9', border: '#cbd5e1', color: '#334155' }
  return { background: '#dbeafe', border: '#93c5fd', color: '#1d4ed8' }
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
