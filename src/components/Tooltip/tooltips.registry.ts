import type { NovaSchemaRegistry } from '@endge/nova'
import { Tooltips } from '@/components/Tooltip/Tooltips'
import {
  createTooltipsDescriptor,
  type TooltipsDescriptor,
} from '@/components/Tooltip/tooltips.config'
import type { TooltipsSchema } from '@/components/Tooltip/tooltip.types'

export const TOOLTIPS_DESCRIPTOR: TooltipsDescriptor = createTooltipsDescriptor((context, schema) => {
  const tooltipsSchema = schema as TooltipsSchema
  return new Tooltips(
    context.app,
    context.surface,
    tooltipsSchema.props,
    { componentId: tooltipsSchema.id },
    TOOLTIPS_DESCRIPTOR,
  )
})

export function registerTooltips(registry: { register: (descriptor: TooltipsDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(TOOLTIPS_DESCRIPTOR, { override: true })
}

export function registerTooltipsSchema(registry: NovaSchemaRegistry): void {
  registerTooltips(registry)
}
