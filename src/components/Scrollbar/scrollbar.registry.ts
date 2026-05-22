import type { NovaSchemaRegistry } from '@endge/nova'
import { Scrollbar } from '@/components/Scrollbar/Scrollbar'
import {
  SCROLLBAR_FIELD_DEFINITIONS,
  createScrollbarDescriptor,
  normalizeScrollbarProps,
  type ScrollbarDescriptor,
} from '@/components/Scrollbar/scrollbar.config'
import type { ScrollbarSchema } from '@/components/Scrollbar/scrollbar.types'

export const SCROLLBAR_DESCRIPTOR: ScrollbarDescriptor = createScrollbarDescriptor((context, schema) => {
  const scrollbarSchema = schema as ScrollbarSchema
  return new Scrollbar(context.app, context.surface, normalizeScrollbarProps(scrollbarSchema.props), { componentId: scrollbarSchema.id }, SCROLLBAR_DESCRIPTOR)
})

export { SCROLLBAR_FIELD_DEFINITIONS }

export function registerScrollbar(registry: { register: (descriptor: ScrollbarDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(SCROLLBAR_DESCRIPTOR, { override: true })
}

export function registerScrollbarSchema(registry: NovaSchemaRegistry): void {
  registerScrollbar(registry)
}
