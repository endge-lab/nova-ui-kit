import type { NovaSchemaRegistry } from '@endge/nova'
import { Image } from '@/components/Image/Image'
import {
  IMAGE_FIELD_DEFINITIONS,
  createImageDescriptor,
  normalizeImageProps,
  type ImageDescriptor,
} from '@/components/Image/image.config'
import type { ImageSchema } from '@/components/Image/image.types'

export const IMAGE_DESCRIPTOR: ImageDescriptor = createImageDescriptor((context, schema) => {
  const imageSchema = schema as ImageSchema
  return new Image(
    context.app,
    context.surface,
    normalizeImageProps(imageSchema.props),
    { componentId: imageSchema.id },
    IMAGE_DESCRIPTOR,
  )
})

export { IMAGE_FIELD_DEFINITIONS }

export function registerImage(registry: { register: (descriptor: ImageDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(IMAGE_DESCRIPTOR, { override: true })
}

export function registerImageSchema(registry: NovaSchemaRegistry): void {
  registerImage(registry)
}

