import type { NovaSchemaRegistry } from '@endge/nova'
import type { FlexDescriptor } from '@/components/Flex/flex.config'
import type { FlexSchema } from '@/components/Flex/flex.types'
import { Flex } from '@/components/Flex/Flex'
import {
  createFlexDescriptor,
  FLEX_FIELD_DEFINITIONS,

  normalizeFlexProps,
} from '@/components/Flex/flex.config'

export const FLEX_DESCRIPTOR: FlexDescriptor = createFlexDescriptor((context, schema) => {
  const flexSchema = schema as FlexSchema
  return new Flex(
    context.app,
    context.surface,
    normalizeFlexProps(flexSchema.props),
    {
      componentId: flexSchema.id,
      children: flexSchema.children ?? [],
    },
    FLEX_DESCRIPTOR,
  )
})

export { FLEX_FIELD_DEFINITIONS }

/** Регистрирует Flex descriptor в Nova schema registry. */
export function registerFlex(registry: { register: (descriptor: FlexDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(FLEX_DESCRIPTOR, { override: true })
}

/** Регистрирует Flex в конкретном NovaSchemaRegistry. */
export function registerFlexSchema(registry: NovaSchemaRegistry): void {
  registerFlex(registry)
}
