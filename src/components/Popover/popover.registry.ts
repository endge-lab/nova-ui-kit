import type { NovaSchemaRegistry } from '@endge/nova'
import { Popover } from '@/components/Popover/Popover'
import { POPOVER_FIELD_DEFINITIONS, createPopoverDescriptor, normalizePopoverProps, type PopoverDescriptor } from '@/components/Popover/popover.config'
import type { PopoverSchema } from '@/components/Popover/popover.types'

export const POPOVER_DESCRIPTOR: PopoverDescriptor = createPopoverDescriptor((context, schema) => {
  const popoverSchema = schema as PopoverSchema
  return new Popover(context.app, context.surface, normalizePopoverProps(popoverSchema.props), { componentId: popoverSchema.id, children: popoverSchema.children }, POPOVER_DESCRIPTOR)
})
export { POPOVER_FIELD_DEFINITIONS }
export function registerPopover(registry: { register: (descriptor: PopoverDescriptor, options?: { override?: boolean }) => void }): void { registry.register(POPOVER_DESCRIPTOR, { override: true }) }
export function registerPopoverSchema(registry: NovaSchemaRegistry): void { registerPopover(registry) }
