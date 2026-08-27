import type { NovaSchemaRegistry } from '@endge/nova'
import type { DialogsSchema } from '@/components/Dialog/dialog.types'
import type { DialogsDescriptor } from '@/components/Dialog/dialogs.config'
import { Dialogs } from '@/components/Dialog/Dialogs'
import {
  createDialogsDescriptor,

} from '@/components/Dialog/dialogs.config'

export const DIALOGS_DESCRIPTOR: DialogsDescriptor = createDialogsDescriptor((context, schema) => {
  const dialogsSchema = schema as DialogsSchema
  return new Dialogs(
    context.app,
    context.surface,
    dialogsSchema.props,
    { componentId: dialogsSchema.id },
    DIALOGS_DESCRIPTOR,
  )
})

export function registerDialogs(registry: { register: (descriptor: DialogsDescriptor, options?: { override?: boolean }) => void }): void {
  registry.register(DIALOGS_DESCRIPTOR, { override: true })
}

export function registerDialogsSchema(registry: NovaSchemaRegistry): void {
  registerDialogs(registry)
}
