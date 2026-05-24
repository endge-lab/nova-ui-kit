import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import { NOVA_UI_COMMON_DIRTY_POLICY, NOVA_UI_COMMON_FIELD_DEFINITIONS, commonMeasureBounds, finiteNumber, normalizeCommonProps } from '@/shared/component'
import { POPOVER_SCHEMA_TYPE, type PopoverApi, type PopoverProps, type PopoverResolvedProps } from '@/components/Popover/popover.types'

export type PopoverDescriptor = NovaComponentDescriptor<PopoverResolvedProps, PopoverApi, Record<string, never>, PopoverProps>
export type PopoverNodeFactory = <E extends EventList>(context: NovaComponentCreateContext<E>, schema: NovaComponentSchema<PopoverProps>) => NovaComponentNode<PopoverResolvedProps, PopoverApi, Record<string, never>, PopoverProps, E>

export const POPOVER_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  open: { type: 'boolean' },
  anchor: { type: 'record' },
  placement: { type: 'string' },
  offset: { type: 'number' },
  collision: { type: 'record' },
  dismiss: { type: 'record' },
  arrow: { type: 'boolean' },
  backdrop: { type: 'boolean' },
  surface: { type: 'record' },
  parts: { type: 'record' },
  onOpenChange: { type: 'function' },
} as const

export function normalizePopoverProps(props: PopoverProps = {}): PopoverResolvedProps {
  const dismiss = typeof props.dismiss === 'object' ? { outside: props.dismiss.outside ?? true, escape: props.dismiss.escape ?? true } : { outside: props.dismiss ?? true, escape: props.dismiss ?? true }
  return {
    ...normalizeCommonProps(props, { width: 280, height: 160, background: 'var(--nova-popover-background, #ffffff)', color: 'var(--nova-popover-color, #172033)', border: { color: 'var(--nova-popover-border-color, #cbd5e1)', width: 1, radius: 10 }, padding: { horizontal: 12, vertical: 12 } }),
    open: props.open ?? false,
    anchor: props.anchor,
    placement: props.placement ?? 'bottom-start',
    offset: Math.max(0, finiteNumber(props.offset, 8)),
    collision: { mode: props.collision?.mode ?? 'shift', padding: Math.max(0, finiteNumber(props.collision?.padding, 8)) },
    dismiss,
    arrow: props.arrow ?? false,
    backdrop: props.backdrop ?? false,
    surface: props.surface,
    parts: props.parts,
    onOpenChange: props.onOpenChange,
  }
}

export function createPopoverDescriptor(createNode?: PopoverNodeFactory): PopoverDescriptor {
  const descriptor: PopoverDescriptor = { type: POPOVER_SCHEMA_TYPE, name: 'Popover', title: 'Popover', version: '0.1.0', kind: 'node-component', dirtyPolicy: { matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix, update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'open', 'anchor', 'placement', 'offset', 'collision'], render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'dismiss', 'arrow', 'backdrop', 'surface', 'parts', 'onOpenChange'] }, fields: POPOVER_FIELD_DEFINITIONS, normalize: schema => normalizePopoverProps(schema.props), measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizePopoverProps) }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const POPOVER_NODE_DESCRIPTOR = createPopoverDescriptor()
