import type { NovaSchemaRegistry } from '@endge/nova'
import { Button } from '@/components/Button/Button'
import {
  BUTTON_FIELD_DEFINITIONS,
  createButtonDescriptor,
  normalizeButtonProps,
  type ButtonDescriptor,
} from '@/components/Button/Button.config'
import type { ButtonSchema } from '@/components/Button/Button.types'

export const BUTTON_DESCRIPTOR: ButtonDescriptor = createButtonDescriptor((context, schema) => {
  const buttonSchema = schema as ButtonSchema
  return new Button(
    context.app,
    context.surface,
    normalizeButtonProps(buttonSchema.props),
    { componentId: buttonSchema.id },
    BUTTON_DESCRIPTOR,
  )
})

export { BUTTON_FIELD_DEFINITIONS }

export function registerButton(registry: { register: (descriptor: ButtonDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(BUTTON_DESCRIPTOR, { override: true })
}

export function registerButtonSchema(registry: NovaSchemaRegistry): void {
  registerButton(registry)
}
