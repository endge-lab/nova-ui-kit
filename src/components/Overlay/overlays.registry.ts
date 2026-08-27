import type { NovaSchemaRegistry } from '@endge/nova'
import type { OverlaysSchema } from '@/components/Overlay/overlay.types'
import type { OverlaysDescriptor } from '@/components/Overlay/overlays.config'
import { Overlays } from '@/components/Overlay/Overlays'
import {
  createOverlaysDescriptor,

} from '@/components/Overlay/overlays.config'

export const OVERLAYS_DESCRIPTOR: OverlaysDescriptor = createOverlaysDescriptor((context, schema) => {
  const overlaysSchema = schema as OverlaysSchema
  return new Overlays(
    context.app,
    context.surface,
    overlaysSchema.props,
    { componentId: overlaysSchema.id },
    OVERLAYS_DESCRIPTOR,
  )
})

export function registerOverlays(registry: { register: (descriptor: OverlaysDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(OVERLAYS_DESCRIPTOR, { override: true })
}

export function registerOverlaysSchema(registry: NovaSchemaRegistry): void {
  registerOverlays(registry)
}
