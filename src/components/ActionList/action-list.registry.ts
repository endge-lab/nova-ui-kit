import type { NovaSchemaRegistry } from '@endge/nova'
import { ActionList } from '@/components/ActionList/ActionList'
import { ACTION_LIST_FIELD_DEFINITIONS, createActionListDescriptor, normalizeActionListProps, type ActionListDescriptor } from '@/components/ActionList/action-list.config'
import type { ActionListSchema } from '@/components/ActionList/action-list.types'

export const ACTION_LIST_DESCRIPTOR: ActionListDescriptor = createActionListDescriptor((context, schema) => new ActionList(context.app, context.surface, normalizeActionListProps((schema as ActionListSchema).props), { componentId: (schema as ActionListSchema).id }, ACTION_LIST_DESCRIPTOR))
export { ACTION_LIST_FIELD_DEFINITIONS }
export function registerActionList(registry: { register: (descriptor: ActionListDescriptor, options?: { override?: boolean }) => void }): void { registry.register(ACTION_LIST_DESCRIPTOR, { override: true }) }
export function registerActionListSchema(registry: NovaSchemaRegistry): void { registerActionList(registry) }
