import type { NovaSchemaRegistry } from '@endge/nova'
import { Tooltip } from '@/components/Tooltip/Tooltip'
import {
  TOOLTIP_FIELD_DEFINITIONS,
  createTooltipDescriptor,
  type TooltipDescriptor,
} from '@/components/Tooltip/tooltip.config'
import type { TooltipSchema } from '@/components/Tooltip/tooltip.types'

export const TOOLTIP_DESCRIPTOR: TooltipDescriptor = createTooltipDescriptor((context, schema) => {
  const tooltipSchema = schema as TooltipSchema
  return new Tooltip(
    context.app,
    context.surface,
    tooltipSchema.props,
    {
      componentId: tooltipSchema.id,
      trigger: tooltipSchema.trigger,
      children: tooltipSchema.children,
    },
    TOOLTIP_DESCRIPTOR,
  )
})

export { TOOLTIP_FIELD_DEFINITIONS }

export function registerTooltip(registry: { register: (descriptor: TooltipDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(TOOLTIP_DESCRIPTOR, { override: true })
}

export function registerTooltipSchema(registry: NovaSchemaRegistry): void {
  registerTooltip(registry)
}
