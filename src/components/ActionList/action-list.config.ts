import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import { NOVA_UI_COMMON_DIRTY_POLICY, NOVA_UI_COMMON_FIELD_DEFINITIONS, commonMeasureBounds, finiteNumber, normalizeCommonProps } from '@/shared/component'
import { ACTION_LIST_SCHEMA_TYPE, type ActionListApi, type ActionListProps, type ActionListResolvedProps } from '@/components/ActionList/action-list.types'

export type ActionListDescriptor = NovaComponentDescriptor<ActionListResolvedProps, ActionListApi, Record<string, never>, ActionListProps>
export type ActionListNodeFactory = <E extends EventList>(context: NovaComponentCreateContext<E>, schema: NovaComponentSchema<ActionListProps>) => NovaComponentNode<ActionListResolvedProps, ActionListApi, Record<string, never>, ActionListProps, E>
export const ACTION_LIST_FIELD_DEFINITIONS = { ...NOVA_UI_COMMON_FIELD_DEFINITIONS, items: { type: 'array' }, value: { type: 'any' }, activeIndex: { type: 'number' }, itemHeight: { type: 'number' }, loop: { type: 'boolean' }, selectable: { type: 'boolean' }, parts: { type: 'record' }, onAction: { type: 'function' }, onValueChange: { type: 'function' } } as const
export function normalizeActionListProps(props: ActionListProps = {}): ActionListResolvedProps {
  const itemHeight = Math.max(24, finiteNumber(props.itemHeight, 36))
  return { ...normalizeCommonProps(props, { width: 260, height: itemHeight * Math.max(1, props.items?.length ?? 4) + 12, background: 'var(--nova-action-list-background, #ffffff)', color: 'var(--nova-action-list-color, #172033)', border: { color: 'var(--nova-action-list-border-color, #cbd5e1)', width: 1, radius: 8 }, padding: { horizontal: 6, vertical: 6 }, activeBackground: '#eff6ff', cursor: { hover: 'pointer', pressed: 'pointer', disabled: 'not-allowed' } }), items: props.items ?? [], value: props.value, activeIndex: Math.max(0, Math.trunc(finiteNumber(props.activeIndex, 0))), itemHeight, loop: props.loop ?? true, selectable: props.selectable ?? true, parts: props.parts, onAction: props.onAction, onValueChange: props.onValueChange }
}
export function createActionListDescriptor(createNode?: ActionListNodeFactory): ActionListDescriptor {
  const descriptor: ActionListDescriptor = { type: ACTION_LIST_SCHEMA_TYPE, name: 'ActionList', title: 'ActionList', version: '0.1.0', kind: 'node-component', dirtyPolicy: { matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix, update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'items', 'itemHeight'], render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'items', 'value', 'activeIndex', 'loop', 'selectable', 'parts', 'onAction', 'onValueChange'] }, fields: ACTION_LIST_FIELD_DEFINITIONS, normalize: schema => normalizeActionListProps(schema.props), measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeActionListProps) }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}
export const ACTION_LIST_NODE_DESCRIPTOR = createActionListDescriptor()
