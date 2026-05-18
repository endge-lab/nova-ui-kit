import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'

export const TOGGLE_SCHEMA_TYPE = 'nova-ui.toggle'

export interface ToggleProps extends NovaUiCommonProps {
  checked?: boolean
  label?: string
  onChange?: (checked: boolean, event?: Event) => void
  onValueChange?: (checked: boolean, event?: Event) => void
}

export interface ToggleResolvedProps extends NovaUiCommonResolvedProps {
  checked: boolean
  label: string
  onChange?: (checked: boolean, event?: Event) => void
  onValueChange?: (checked: boolean, event?: Event) => void
}

export type ToggleSchema = NovaComponentSchema<ToggleProps>

export interface ToggleApi {
  setChecked: (checked: boolean) => void
  toggle: (event?: Event) => void
  setProps: (patch: ToggleProps) => void
  getProps: () => Readonly<ToggleResolvedProps>
}
