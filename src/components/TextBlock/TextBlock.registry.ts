import type { NovaSchemaRegistry } from '@endge/nova'
import { TextBlock } from '@/components/TextBlock/TextBlock'
import {
  createTextBlockDescriptor,
  type TextBlockDescriptor,
} from '@/components/TextBlock/TextBlock.config'

export const TEXT_BLOCK_DESCRIPTOR: TextBlockDescriptor = createTextBlockDescriptor((context, schema) => new TextBlock(
  context.app,
  context.surface,
  schema.props,
  {
    componentId: schema.id,
  },
  TEXT_BLOCK_DESCRIPTOR,
))

export function registerTextBlock(registry: { register: (descriptor: TextBlockDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(TEXT_BLOCK_DESCRIPTOR, { override: true })
}

export function registerTextBlockSchema(registry: NovaSchemaRegistry): void {
  registerTextBlock(registry)
}
