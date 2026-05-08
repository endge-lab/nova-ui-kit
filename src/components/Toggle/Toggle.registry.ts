import type { NovaSchemaRegistry } from '@endge/nova'
import { Toggle } from '@/components/Toggle/Toggle'
import {
  TOGGLE_FIELD_DEFINITIONS,
  createToggleDescriptor,
  normalizeToggleProps,
  type ToggleDescriptor,
} from '@/components/Toggle/Toggle.config'
import type { ToggleSchema } from '@/components/Toggle/types'

export const TOGGLE_DESCRIPTOR: ToggleDescriptor = createToggleDescriptor((context, schema) => {
  const toggleSchema = schema as ToggleSchema
  return new Toggle(context.app, context.surface, normalizeToggleProps(toggleSchema.props), { componentId: toggleSchema.id }, TOGGLE_DESCRIPTOR)
})

export { TOGGLE_FIELD_DEFINITIONS }

export function registerToggle(registry: { register: (descriptor: ToggleDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(TOGGLE_DESCRIPTOR, { override: true })
}

export function registerToggleSchema(registry: NovaSchemaRegistry): void {
  registerToggle(registry)
}
