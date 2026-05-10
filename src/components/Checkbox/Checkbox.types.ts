import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'

export const CHECKBOX_SCHEMA_TYPE = 'nova-ui.checkbox'

export interface CheckboxProps extends NovaUiCommonProps {
  checked?: boolean
  indeterminate?: boolean
  label?: string
  onChange?: (checked: boolean, event?: Event) => void
}

export interface CheckboxResolvedProps extends NovaUiCommonResolvedProps {
  checked: boolean
  indeterminate: boolean
  label: string
  onChange?: (checked: boolean, event?: Event) => void
}

export type CheckboxSchema = NovaComponentSchema<CheckboxProps>

export interface CheckboxApi {
  setChecked: (checked: boolean) => void
  toggle: (event?: Event) => void
  setProps: (patch: CheckboxProps) => void
  getProps: () => Readonly<CheckboxResolvedProps>
}
