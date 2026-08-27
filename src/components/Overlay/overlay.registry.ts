import type { NovaSchemaRegistry } from '@endge/nova'
import type { OverlayDescriptor } from '@/components/Overlay/overlay.config'
import type { OverlaySchema } from '@/components/Overlay/overlay.types'
import { Overlay } from '@/components/Overlay/Overlay'
import {
  createOverlayDescriptor,
  normalizeOverlayProps,
  OVERLAY_FIELD_DEFINITIONS,

} from '@/components/Overlay/overlay.config'

export const OVERLAY_DESCRIPTOR: OverlayDescriptor = createOverlayDescriptor((context, schema) => {
  const overlaySchema = schema as OverlaySchema
  return new Overlay(
    context.app,
    context.surface,
    normalizeOverlayProps(overlaySchema.props),
    { componentId: overlaySchema.id, children: overlaySchema.children },
    OVERLAY_DESCRIPTOR,
  )
})

export { OVERLAY_FIELD_DEFINITIONS }

export function registerOverlay(registry: { register: (descriptor: OverlayDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(OVERLAY_DESCRIPTOR, { override: true })
}

export function registerOverlaySchema(registry: NovaSchemaRegistry): void {
  registerOverlay(registry)
}
