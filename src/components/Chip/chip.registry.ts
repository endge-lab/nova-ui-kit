import type { NovaSchemaRegistry } from '@endge/nova'
import type { ChipDescriptor } from '@/components/Chip/chip.config'
import type { ChipSchema } from '@/components/Chip/chip.types'
import { Chip } from '@/components/Chip/Chip'
import { CHIP_FIELD_DEFINITIONS, createChipDescriptor, normalizeChipProps } from '@/components/Chip/chip.config'

export const CHIP_DESCRIPTOR: ChipDescriptor = createChipDescriptor((context, schema) => new Chip(context.app, context.surface, normalizeChipProps((schema as ChipSchema).props), { componentId: (schema as ChipSchema).id }, CHIP_DESCRIPTOR))
export { CHIP_FIELD_DEFINITIONS }
export function registerChip(registry: { register: (descriptor: ChipDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(CHIP_DESCRIPTOR, { override: true })
}
export function registerChipSchema(registry: NovaSchemaRegistry): void {
  registerChip(registry)
}
