import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  finiteNumber,
  normalizeCommonProps,
} from '@/shared/component'
import {
  TOOLTIP_SCHEMA_TYPE,
  type TooltipApi,
  type TooltipProps,
  type TooltipResolvedProps,
} from '@/components/Tooltip/tooltip.types'

export type TooltipDescriptor = NovaComponentDescriptor<TooltipResolvedProps, TooltipApi, Record<string, never>, TooltipProps>

export type TooltipNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<TooltipProps>,
) => NovaComponentNode<TooltipResolvedProps, TooltipApi, Record<string, never>, TooltipProps, E>

export const TOOLTIP_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  content: { type: 'string' },
  placement: { type: 'string' },
  delay: { type: 'number' },
  open: { type: 'boolean' },
} as const

export function normalizeTooltipProps(props: TooltipProps = {}): TooltipResolvedProps {
  return {
    ...normalizeCommonProps(props, {
      width: 120,
      height: 32,
      background: '#111827',
      color: '#ffffff',
      border: { color: 'rgba(255,255,255,0.12)', width: 1, radius: 7 },
      padding: { horizontal: 10, vertical: 7 },
    }),
    content: props.content ?? '',
    placement: props.placement ?? 'top',
    delay: Math.max(0, finiteNumber(props.delay, 180)),
    open: props.open ?? false,
  }
}

export function createTooltipDescriptor(createNode?: TooltipNodeFactory): TooltipDescriptor {
  const descriptor: TooltipDescriptor = {
    type: TOOLTIP_SCHEMA_TYPE,
    name: 'Tooltip',
    title: 'Tooltip',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'content', 'placement'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'delay', 'open'],
    },
    fields: TOOLTIP_FIELD_DEFINITIONS,
    normalize: schema => normalizeTooltipProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeTooltipProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const TOOLTIP_NODE_DESCRIPTOR = createTooltipDescriptor()
