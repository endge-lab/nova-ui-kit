import type { NovaSchemaRegistry } from '@endge/nova'
import type { CheckboxDescriptor } from '@/components/Checkbox/checkbox.config'
import type { CheckboxSchema } from '@/components/Checkbox/checkbox.types'
import { Checkbox } from '@/components/Checkbox/Checkbox'
import {
  CHECKBOX_FIELD_DEFINITIONS,

  createCheckboxDescriptor,
  normalizeCheckboxProps,
} from '@/components/Checkbox/checkbox.config'

export const CHECKBOX_DESCRIPTOR: CheckboxDescriptor = createCheckboxDescriptor((context, schema) => {
  const checkboxSchema = schema as CheckboxSchema
  return new Checkbox(context.app, context.surface, normalizeCheckboxProps(checkboxSchema.props), { componentId: checkboxSchema.id }, CHECKBOX_DESCRIPTOR)
})

export { CHECKBOX_FIELD_DEFINITIONS }

export function registerCheckbox(registry: { register: (descriptor: CheckboxDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(CHECKBOX_DESCRIPTOR, { override: true })
}

export function registerCheckboxSchema(registry: NovaSchemaRegistry): void {
  registerCheckbox(registry)
}
