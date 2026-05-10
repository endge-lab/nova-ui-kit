import type { NovaSchemaRegistry } from '@endge/nova'
import { Tag } from '@/components/Tag/Tag'
import {
  TAG_FIELD_DEFINITIONS,
  createTagDescriptor,
  normalizeTagProps,
  type TagDescriptor,
} from '@/components/Tag/Tag.config'
import type { TagSchema } from '@/components/Tag/Tag.types'

export const TAG_DESCRIPTOR: TagDescriptor = createTagDescriptor((context, schema) => {
  const tagSchema = schema as TagSchema
  return new Tag(context.app, context.surface, normalizeTagProps(tagSchema.props), { componentId: tagSchema.id }, TAG_DESCRIPTOR)
})

export { TAG_FIELD_DEFINITIONS }

export function registerTag(registry: { register: (descriptor: TagDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(TAG_DESCRIPTOR, { override: true })
}

export function registerTagSchema(registry: NovaSchemaRegistry): void {
  registerTag(registry)
}
