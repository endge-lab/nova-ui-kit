import type { NovaSchemaRegistry } from '@endge/nova'
import type { DividerDescriptor } from '@/components/Divider/divider.config'
import type { DividerSchema } from '@/components/Divider/divider.types'
import { Divider } from '@/components/Divider/Divider'
import {
  createDividerDescriptor,
  DIVIDER_FIELD_DEFINITIONS,

  normalizeDividerProps,
} from '@/components/Divider/divider.config'

export const DIVIDER_DESCRIPTOR: DividerDescriptor = createDividerDescriptor((context, schema) => {
  const dividerSchema = schema as DividerSchema
  return new Divider(context.app, context.surface, normalizeDividerProps(dividerSchema.props), { componentId: dividerSchema.id }, DIVIDER_DESCRIPTOR)
})

export { DIVIDER_FIELD_DEFINITIONS }

export function registerDivider(registry: { register: (descriptor: DividerDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(DIVIDER_DESCRIPTOR, { override: true })
}

export function registerDividerSchema(registry: NovaSchemaRegistry): void {
  registerDivider(registry)
}
