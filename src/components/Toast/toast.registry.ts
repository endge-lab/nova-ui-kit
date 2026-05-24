import type { NovaSchemaRegistry } from '@endge/nova'
import { Toast, ToastRegion } from '@/components/Toast/Toast'
import { TOAST_FIELD_DEFINITIONS, TOAST_REGION_FIELD_DEFINITIONS, createToastDescriptor, createToastRegionDescriptor, normalizeToastProps, normalizeToastRegionProps, type ToastDescriptor, type ToastRegionDescriptor } from '@/components/Toast/toast.config'
import type { ToastRegionSchema, ToastSchema } from '@/components/Toast/toast.types'

export const TOAST_DESCRIPTOR: ToastDescriptor = createToastDescriptor((context, schema) => {
  const toastSchema = schema as ToastSchema
  return new Toast(context.app, context.surface, normalizeToastProps(toastSchema.props), { componentId: toastSchema.id }, TOAST_DESCRIPTOR)
})
export const TOAST_REGION_DESCRIPTOR: ToastRegionDescriptor = createToastRegionDescriptor((context, schema) => {
  const regionSchema = schema as ToastRegionSchema
  return new ToastRegion(context.app, context.surface, normalizeToastRegionProps(regionSchema.props), { componentId: regionSchema.id }, TOAST_REGION_DESCRIPTOR)
})
export { TOAST_FIELD_DEFINITIONS, TOAST_REGION_FIELD_DEFINITIONS }
export function registerToast(registry: { register: (descriptor: ToastDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(TOAST_DESCRIPTOR, { override: true })
}
export function registerToastRegion(registry: { register: (descriptor: ToastRegionDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(TOAST_REGION_DESCRIPTOR, { override: true })
}
export function registerToastSchema(registry: NovaSchemaRegistry): void {
  registerToast(registry)
  registerToastRegion(registry)
}
