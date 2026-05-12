import type { NovaSchemaRegistry } from '@endge/nova'
import { ScrollArea } from '@/components/ScrollArea/ScrollArea'
import {
  SCROLL_AREA_FIELD_DEFINITIONS,
  createScrollAreaDescriptor,
  normalizeScrollAreaProps,
  type ScrollAreaDescriptor,
} from '@/components/ScrollArea/ScrollArea.config'
import type { ScrollAreaSchema } from '@/components/ScrollArea/ScrollArea.types'

export const SCROLL_AREA_DESCRIPTOR: ScrollAreaDescriptor = createScrollAreaDescriptor((context, schema) => {
  const scrollAreaSchema = schema as ScrollAreaSchema
  return new ScrollArea(
    context.app,
    context.surface,
    normalizeScrollAreaProps(scrollAreaSchema.props),
    {
      componentId: scrollAreaSchema.id,
      children: scrollAreaSchema.children ?? [],
      slots: scrollAreaSchema.slots ?? {},
    },
    SCROLL_AREA_DESCRIPTOR,
  )
})

export { SCROLL_AREA_FIELD_DEFINITIONS }

export function registerScrollArea(registry: { register: (descriptor: ScrollAreaDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(SCROLL_AREA_DESCRIPTOR, { override: true })
}

export function registerScrollAreaSchema(registry: NovaSchemaRegistry): void {
  registerScrollArea(registry)
}
