import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import { NOVA_UI_COMMON_DIRTY_POLICY, NOVA_UI_COMMON_FIELD_DEFINITIONS, clamp, commonMeasureBounds, finiteNumber, normalizeCommonProps } from '@/shared/component'
import { DIALOG_SCHEMA_TYPE, type DialogApi, type DialogProps, type DialogResolvedProps } from '@/components/Dialog/dialog.types'

export type DialogDescriptor = NovaComponentDescriptor<DialogResolvedProps, DialogApi, Record<string, never>, DialogProps>
export type DialogNodeFactory = <E extends EventList>(context: NovaComponentCreateContext<E>, schema: NovaComponentSchema<DialogProps>) => NovaComponentNode<DialogResolvedProps, DialogApi, Record<string, never>, DialogProps, E>

export const DIALOG_FIELD_DEFINITIONS = { ...NOVA_UI_COMMON_FIELD_DEFINITIONS, open: { type: 'boolean' }, modal: { type: 'boolean' }, backdrop: { type: 'boolean' }, title: { type: 'string' }, description: { type: 'string' }, placement: { type: 'string' }, position: { type: 'record' }, dismiss: { type: 'record' }, closeButton: { type: 'boolean' }, draggable: { type: 'boolean' }, resizable: { type: 'boolean' }, scale: { type: 'number' }, minWidth: { type: 'number' }, minHeight: { type: 'number' }, maxWidth: { type: 'number' }, maxHeight: { type: 'number' }, header: { type: 'array' }, footer: { type: 'array' }, parts: { type: 'record' }, onOpenChange: { type: 'function' }, onMove: { type: 'function' }, onResize: { type: 'function' } } as const

export function normalizeDialogProps(props: DialogProps = {}): DialogResolvedProps {
  const dismiss = typeof props.dismiss === 'object' ? { outside: props.dismiss.outside ?? true, escape: props.dismiss.escape ?? true } : { outside: props.dismiss ?? true, escape: props.dismiss ?? true }
  return {
    ...normalizeCommonProps(props, { width: 420, height: 260, background: 'var(--nova-dialog-background, #ffffff)', color: 'var(--nova-dialog-color, #172033)', border: { color: 'var(--nova-dialog-border-color, #cbd5e1)', width: 1, radius: 12 }, padding: { horizontal: 18, vertical: 16 } }),
    open: props.open ?? false,
    modal: props.modal ?? true,
    backdrop: props.backdrop ?? true,
    title: props.title ?? '',
    description: props.description ?? '',
    placement: props.placement ?? 'center',
    position: props.position,
    dismiss,
    closeButton: props.closeButton ?? true,
    draggable: props.draggable ?? false,
    resizable: props.resizable ?? false,
    scale: clamp(finiteNumber(props.scale, 1), 0.5, 3),
    minWidth: Math.max(120, finiteNumber(props.minWidth, 240)),
    minHeight: Math.max(100, finiteNumber(props.minHeight, 160)),
    maxWidth: Math.max(120, finiteNumber(props.maxWidth, 1200)),
    maxHeight: Math.max(100, finiteNumber(props.maxHeight, 900)),
    header: props.header ?? [],
    footer: props.footer ?? [],
    parts: props.parts,
    onOpenChange: props.onOpenChange,
    onMove: props.onMove,
    onResize: props.onResize,
  }
}

export function createDialogDescriptor(createNode?: DialogNodeFactory): DialogDescriptor {
  const descriptor: DialogDescriptor = { type: DIALOG_SCHEMA_TYPE, name: 'Dialog', title: 'Dialog', version: '0.1.0', kind: 'node-component', dirtyPolicy: { matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix, update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'open', 'position', 'placement', 'scale', 'header', 'footer'], render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'modal', 'backdrop', 'title', 'description', 'dismiss', 'closeButton', 'draggable', 'resizable', 'parts', 'onOpenChange', 'onMove', 'onResize'] }, fields: DIALOG_FIELD_DEFINITIONS, normalize: schema => normalizeDialogProps(schema.props), measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeDialogProps) }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const DIALOG_NODE_DESCRIPTOR = createDialogDescriptor()
