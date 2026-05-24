import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import { NOVA_UI_COMMON_DIRTY_POLICY, NOVA_UI_COMMON_FIELD_DEFINITIONS, clamp, commonMeasureBounds, finiteNumber, normalizeCommonProps } from '@/shared/component'
import { TOAST_REGION_SCHEMA_TYPE, TOAST_SCHEMA_TYPE, type ToastApi, type ToastProps, type ToastRegionApi, type ToastRegionProps, type ToastRegionResolvedProps, type ToastResolvedProps, type ToastTone } from '@/components/Toast/toast.types'

export type ToastDescriptor = NovaComponentDescriptor<ToastResolvedProps, ToastApi, Record<string, never>, ToastProps>
export type ToastRegionDescriptor = NovaComponentDescriptor<ToastRegionResolvedProps, ToastRegionApi, Record<string, never>, ToastRegionProps>
export type ToastNodeFactory = <E extends EventList>(context: NovaComponentCreateContext<E>, schema: NovaComponentSchema<ToastProps>) => NovaComponentNode<ToastResolvedProps, ToastApi, Record<string, never>, ToastProps, E>
export type ToastRegionNodeFactory = <E extends EventList>(context: NovaComponentCreateContext<E>, schema: NovaComponentSchema<ToastRegionProps>) => NovaComponentNode<ToastRegionResolvedProps, ToastRegionApi, Record<string, never>, ToastRegionProps, E>
export const TOAST_FIELD_DEFINITIONS = { ...NOVA_UI_COMMON_FIELD_DEFINITIONS, title: { type: 'string' }, message: { type: 'string' }, icon: { type: 'icon' }, tone: { type: 'string' }, actionLabel: { type: 'string' }, progress: { type: 'number' }, closeButton: { type: 'boolean' }, parts: { type: 'record' }, onAction: { type: 'function' }, onClose: { type: 'function' } } as const
export const TOAST_REGION_FIELD_DEFINITIONS = { ...NOVA_UI_COMMON_FIELD_DEFINITIONS, items: { type: 'array' }, placement: { type: 'string' }, limit: { type: 'number' }, gap: { type: 'number' }, newestFirst: { type: 'boolean' }, autoDismiss: { type: 'boolean' }, pauseOnHover: { type: 'boolean' }, parts: { type: 'record' }, onDismiss: { type: 'function' }, onAction: { type: 'function' } } as const

export function normalizeToastProps(props: ToastProps = {}): ToastResolvedProps {
  const palette = toastPalette(props.tone ?? 'neutral')
  return { ...normalizeCommonProps(props, { width: 320, height: 84, background: palette.background, color: palette.color, border: { color: palette.border, width: 1, radius: 10 }, padding: { horizontal: 14, vertical: 12 } }), title: props.title ?? '', message: props.message ?? '', icon: props.icon, tone: props.tone ?? 'neutral', actionLabel: props.actionLabel ?? '', progress: props.progress === undefined ? undefined : clamp(finiteNumber(props.progress, 0), 0, 1), closeButton: props.closeButton ?? true, parts: props.parts, onAction: props.onAction, onClose: props.onClose }
}

export function normalizeToastRegionProps(props: ToastRegionProps = {}): ToastRegionResolvedProps {
  return { ...normalizeCommonProps(props, { width: 360, height: 320, background: 'rgba(255,255,255,0)' }), items: props.items ?? [], placement: props.placement ?? 'top-right', limit: Math.max(1, Math.trunc(finiteNumber(props.limit, 4))), gap: Math.max(0, finiteNumber(props.gap, 10)), newestFirst: props.newestFirst ?? true, autoDismiss: props.autoDismiss ?? true, pauseOnHover: props.pauseOnHover ?? true, parts: props.parts, onDismiss: props.onDismiss, onAction: props.onAction }
}

export function createToastDescriptor(createNode?: ToastNodeFactory): ToastDescriptor {
  const descriptor: ToastDescriptor = { type: TOAST_SCHEMA_TYPE, name: 'Toast', title: 'Toast', version: '0.1.0', kind: 'node-component', dirtyPolicy: { matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix, update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'title', 'message', 'icon', 'actionLabel'], render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'tone', 'progress', 'closeButton', 'parts', 'onAction', 'onClose'] }, fields: TOAST_FIELD_DEFINITIONS, normalize: schema => normalizeToastProps(schema.props), measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeToastProps) }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}
export function createToastRegionDescriptor(createNode?: ToastRegionNodeFactory): ToastRegionDescriptor {
  const descriptor: ToastRegionDescriptor = { type: TOAST_REGION_SCHEMA_TYPE, name: 'ToastRegion', title: 'ToastRegion', version: '0.1.0', kind: 'node-component', dirtyPolicy: { matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix, update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'items', 'gap', 'limit', 'placement'], render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'newestFirst', 'autoDismiss', 'pauseOnHover', 'parts', 'onDismiss', 'onAction'] }, fields: TOAST_REGION_FIELD_DEFINITIONS, normalize: schema => normalizeToastRegionProps(schema.props), measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeToastRegionProps) }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}
export const TOAST_NODE_DESCRIPTOR = createToastDescriptor()
export const TOAST_REGION_NODE_DESCRIPTOR = createToastRegionDescriptor()
export function toastPalette(tone: ToastTone): { background: string; border: string; color: string } {
  if (tone === 'success') return { background: 'var(--nova-toast-success-background, #ecfdf5)', border: 'var(--nova-toast-success-border-color, #bbf7d0)', color: 'var(--nova-toast-success-color, #047857)' }
  if (tone === 'warning') return { background: 'var(--nova-toast-warning-background, #fffbeb)', border: 'var(--nova-toast-warning-border-color, #fde68a)', color: 'var(--nova-toast-warning-color, #b45309)' }
  if (tone === 'danger') return { background: 'var(--nova-toast-danger-background, #fef2f2)', border: 'var(--nova-toast-danger-border-color, #fecaca)', color: 'var(--nova-toast-danger-color, #b91c1c)' }
  if (tone === 'info') return { background: 'var(--nova-toast-info-background, #eff6ff)', border: 'var(--nova-toast-info-border-color, #bfdbfe)', color: 'var(--nova-toast-info-color, #1d4ed8)' }
  return { background: 'var(--nova-toast-background, #ffffff)', border: 'var(--nova-toast-border-color, #cbd5e1)', color: 'var(--nova-toast-color, #172033)' }
}
