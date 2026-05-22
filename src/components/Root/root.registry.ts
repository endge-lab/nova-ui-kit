import type { NovaSchemaRegistry } from '@endge/nova'
import { Root } from '@/components/Root/Root'
import {
  ROOT_FIELD_DEFINITIONS,
  createRootDescriptor,
  normalizeRootProps,
  type RootDescriptor,
} from '@/components/Root/root.config'
import type { RootSchema } from '@/components/Root/root.types'

export const ROOT_DESCRIPTOR: RootDescriptor = createRootDescriptor((context, schema) => {
  const rootSchema = schema as RootSchema
  return new Root(
    context.app,
    context.surface,
    normalizeRootProps(rootSchema.props),
    {
      componentId: rootSchema.id,
      children: rootSchema.children ?? [],
    },
    ROOT_DESCRIPTOR,
  )
})

export { ROOT_FIELD_DEFINITIONS }

/** Регистрирует Root descriptor в Nova schema registry. */
export function registerRoot(registry: { register: (descriptor: RootDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(ROOT_DESCRIPTOR, { override: true })
}

/** Регистрирует Root в конкретном NovaSchemaRegistry. */
export function registerRootSchema(registry: NovaSchemaRegistry): void {
  registerRoot(registry)
}
