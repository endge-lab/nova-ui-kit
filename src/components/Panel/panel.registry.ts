import type { NovaSchemaRegistry } from '@endge/nova'
import type { PanelDescriptor } from '@/components/Panel/panel.config'
import type { PanelSchema } from '@/components/Panel/panel.types'
import { Panel } from '@/components/Panel/Panel'
import {
  createPanelDescriptor,
  normalizePanelProps,
  PANEL_FIELD_DEFINITIONS,

} from '@/components/Panel/panel.config'

export const PANEL_DESCRIPTOR: PanelDescriptor = createPanelDescriptor((context, schema) => {
  const panelSchema = schema as PanelSchema
  return new Panel(
    context.app,
    context.surface,
    normalizePanelProps(panelSchema.props),
    {
      componentId: panelSchema.id,
      children: panelSchema.children ?? [],
    },
    PANEL_DESCRIPTOR,
  )
})

export { PANEL_FIELD_DEFINITIONS }

export function registerPanel(registry: { register: (descriptor: PanelDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(PANEL_DESCRIPTOR, { override: true })
}

export function registerPanelSchema(registry: NovaSchemaRegistry): void {
  registerPanel(registry)
}
