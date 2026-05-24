import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps, NovaUiIconSource } from '@/shared/component'
import type { NovaUiPartStyleOptions } from '@/domain/domain.types'

export const ACTION_LIST_SCHEMA_TYPE = 'nova-ui.action-list'

export type ActionListItemType = 'item' | 'separator' | 'group' | 'checkbox' | 'radio' | 'submenu'
export interface ActionListItem {
  id?: string
  type?: ActionListItemType
  label?: string
  description?: string
  shortcut?: string
  icon?: NovaUiIconSource
  value?: string | number | boolean
  disabled?: boolean
  selected?: boolean
  checked?: boolean
  tone?: 'neutral' | 'danger' | 'success' | 'warning' | 'info'
  items?: Array<ActionListItem>
}
export interface ActionListProps extends NovaUiCommonProps, NovaUiPartStyleOptions {
  items?: Array<ActionListItem>
  value?: string | number | boolean
  activeIndex?: number
  itemHeight?: number
  loop?: boolean
  selectable?: boolean
  onAction?: (item: ActionListItem, index: number, event?: Event) => void
  onValueChange?: (value: string | number | boolean | undefined, item: ActionListItem, event?: Event) => void
}
export interface ActionListResolvedProps extends NovaUiCommonResolvedProps, NovaUiPartStyleOptions {
  items: Array<ActionListItem>
  value?: string | number | boolean
  activeIndex: number
  itemHeight: number
  loop: boolean
  selectable: boolean
  onAction?: (item: ActionListItem, index: number, event?: Event) => void
  onValueChange?: (value: string | number | boolean | undefined, item: ActionListItem, event?: Event) => void
}
export type ActionListSchema = NovaComponentSchema<ActionListProps>
export interface ActionListApi {
  setProps: (patch: ActionListProps) => void
  setItems: (items: Array<ActionListItem>) => void
  setValue: (value: string | number | boolean | undefined, event?: Event) => void
  focusNext: (event?: Event) => void
  focusPrevious: (event?: Event) => void
  activateFocused: (event?: Event) => void
  getProps: () => Readonly<ActionListResolvedProps>
}
