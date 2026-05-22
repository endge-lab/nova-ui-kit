import type { NovaSchemaRegistry } from '@endge/nova'
import { Surface } from '@/components/Surface/Surface'
import {
  SURFACE_FIELD_DEFINITIONS,
  createSurfaceDescriptor,
  normalizeSurfaceProps,
  type SurfaceDescriptor,
} from '@/components/Surface/surface.config'
import type { SurfaceSchema } from '@/components/Surface/surface.types'

export const SURFACE_DESCRIPTOR: SurfaceDescriptor = createSurfaceDescriptor((context, schema) => {
  const surfaceSchema = schema as SurfaceSchema
  return new Surface(
    context.app,
    context.surface,
    normalizeSurfaceProps(surfaceSchema.props),
    {
      componentId: surfaceSchema.id,
      children: surfaceSchema.children ?? [],
    },
    SURFACE_DESCRIPTOR,
  )
})

export { SURFACE_FIELD_DEFINITIONS }

export function registerSurface(registry: { register: (descriptor: SurfaceDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(SURFACE_DESCRIPTOR, { override: true })
}

export function registerSurfaceSchema(registry: NovaSchemaRegistry): void {
  registerSurface(registry)
}
