import type { NovaSchemaRegistry } from '@endge/nova'
import { ZoomControls } from '@/components/ZoomControls/ZoomControls'
import {
  createZoomControlsDescriptor,
  normalizeZoomControlsProps,
  type ZoomControlsDescriptor,
} from '@/components/ZoomControls/zoom-controls.config'
import type { ZoomControlsSchema } from '@/components/ZoomControls/zoom-controls.types'

export const ZOOM_CONTROLS_DESCRIPTOR: ZoomControlsDescriptor = createZoomControlsDescriptor((context, schema) => {
  const zoomSchema = schema as ZoomControlsSchema
  return new ZoomControls(
    context.app,
    context.surface,
    normalizeZoomControlsProps(zoomSchema.props),
    { componentId: zoomSchema.id },
    ZOOM_CONTROLS_DESCRIPTOR,
  )
})

export function registerZoomControls(registry: { register: (descriptor: ZoomControlsDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(ZOOM_CONTROLS_DESCRIPTOR, { override: true })
}

export function registerZoomControlsSchema(registry: NovaSchemaRegistry): void {
  registerZoomControls(registry)
}
