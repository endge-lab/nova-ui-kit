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
  finiteNumber,
  normalizeCommonProps,
} from '@/shared/component'
import {
  OVERLAY_SCHEMA_TYPE,
  type OverlayApi,
  type OverlayProps,
  type OverlayResolvedProps,
} from '@/components/Overlay/overlay.types'

export type OverlayDescriptor = NovaComponentDescriptor<
  OverlayResolvedProps,
  OverlayApi,
  Record<string, never>,
  OverlayProps
>

export type OverlayNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<OverlayProps>,
) => NovaComponentNode<OverlayResolvedProps, OverlayApi, Record<string, never>, OverlayProps, E>

export const OVERLAY_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  open: { type: 'boolean' },
  kind: { type: 'string' },
  placement: { type: 'string' },
  offset: { type: 'number' },
  anchor: { type: 'record' },
  collision: { type: 'record' },
  dismiss: { type: 'record' },
  modal: { type: 'boolean' },
  backdrop: { type: 'boolean' },
  parts: { type: 'record' },
  onOpenChange: { type: 'function' },
} as const

/** Нормализует props низкоуровневого overlay surface. */
export function normalizeOverlayProps(props: OverlayProps = {}): OverlayResolvedProps {
  const dismiss = typeof props.dismiss === 'object'
    ? { outside: props.dismiss.outside ?? true, escape: props.dismiss.escape ?? true }
    : { outside: props.dismiss ?? true, escape: props.dismiss ?? true }

  return {
    ...normalizeCommonProps(props, {
      width: 240,
      height: 160,
      background: 'var(--nova-overlay-background, #ffffff)',
      color: 'var(--nova-overlay-color, #172033)',
      border: { color: 'var(--nova-overlay-border-color, #cbd5e1)', width: 1, radius: 8 },
      padding: { horizontal: 8, vertical: 8 },
    }),
    open: props.open ?? false,
    kind: props.kind ?? 'popover',
    placement: props.placement ?? 'bottom-start',
    offset: finiteNumber(props.offset, 8),
    anchor: props.anchor ?? { kind: 'root' },
    collision: {
      mode: props.collision?.mode ?? 'shift',
      padding: finiteNumber(props.collision?.padding, 8),
    },
    dismiss,
    modal: props.modal ?? false,
    backdrop: props.backdrop ?? false,
    parts: props.parts,
    onOpenChange: props.onOpenChange,
  }
}

/** Создает descriptor для Overlay. */
export function createOverlayDescriptor(createNode?: OverlayNodeFactory): OverlayDescriptor {
  const descriptor: OverlayDescriptor = {
    type: OVERLAY_SCHEMA_TYPE,
    name: 'Overlay',
    title: 'Overlay',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'open', 'placement', 'offset', 'anchor', 'collision'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'kind', 'dismiss', 'modal', 'backdrop', 'parts', 'onOpenChange'],
    },
    fields: OVERLAY_FIELD_DEFINITIONS,
    normalize: schema => normalizeOverlayProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeOverlayProps),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const OVERLAY_NODE_DESCRIPTOR = createOverlayDescriptor()
