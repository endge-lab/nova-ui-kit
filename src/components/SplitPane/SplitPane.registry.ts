import type { NovaSchemaRegistry } from '@endge/nova'
import { SplitPane } from '@/components/SplitPane/SplitPane'
import {
  SPLIT_PANE_FIELD_DEFINITIONS,
  createSplitPaneDescriptor,
  normalizeSplitPaneProps,
  type SplitPaneDescriptor,
} from '@/components/SplitPane/SplitPane.config'
import type { SplitPaneSchema } from '@/components/SplitPane/SplitPane.types'

export const SPLIT_PANE_DESCRIPTOR: SplitPaneDescriptor = createSplitPaneDescriptor((context, schema) => {
  const splitPaneSchema = schema as SplitPaneSchema
  return new SplitPane(
    context.app,
    context.surface,
    normalizeSplitPaneProps(splitPaneSchema.props),
    {
      componentId: splitPaneSchema.id,
      children: splitPaneSchema.children ?? [],
    },
    SPLIT_PANE_DESCRIPTOR,
  )
})

export { SPLIT_PANE_FIELD_DEFINITIONS }

export function registerSplitPane(registry: { register: (descriptor: SplitPaneDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(SPLIT_PANE_DESCRIPTOR, { override: true })
}

export function registerSplitPaneSchema(registry: NovaSchemaRegistry): void {
  registerSplitPane(registry)
}
