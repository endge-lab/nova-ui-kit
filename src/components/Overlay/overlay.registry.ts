import type { NovaSchemaRegistry } from '@endge/nova'
import { Overlay } from '@/components/Overlay/Overlay'
import {
  OVERLAY_FIELD_DEFINITIONS,
  createOverlayDescriptor,
  normalizeOverlayProps,
  type OverlayDescriptor,
} from '@/components/Overlay/overlay.config'
import type { OverlaySchema } from '@/components/Overlay/overlay.types'

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
