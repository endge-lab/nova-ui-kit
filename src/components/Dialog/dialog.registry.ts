import type { NovaSchemaRegistry } from '@endge/nova'
import type { DialogDescriptor } from '@/components/Dialog/dialog.config'
import type { DialogSchema } from '@/components/Dialog/dialog.types'
import { Dialog } from '@/components/Dialog/Dialog'
import { createDialogDescriptor, DIALOG_FIELD_DEFINITIONS, normalizeDialogProps } from '@/components/Dialog/dialog.config'

export const DIALOG_DESCRIPTOR: DialogDescriptor = createDialogDescriptor((context, schema) => {
  const dialogSchema = schema as DialogSchema
  return new Dialog(
    context.app,
    context.surface,
    normalizeDialogProps(dialogSchema.props),
    {
      componentId: dialogSchema.id,
      children: dialogSchema.children,
      renderBackdrop: dialogSchema.renderBackdrop,
    },
    DIALOG_DESCRIPTOR,
  )
})
export { DIALOG_FIELD_DEFINITIONS }
export function registerDialog(registry: { register: (descriptor: DialogDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(DIALOG_DESCRIPTOR, { override: true })
}
export function registerDialogSchema(registry: NovaSchemaRegistry): void {
  registerDialog(registry)
}
