import type { NovaComponentSchema } from '@endge/nova'
import type {
  NovaUiCommonProps,
  NovaUiCommonResolvedProps,
  NovaUiComponentSize,
  NovaUiIconSource,
} from '@/shared/component/component-props'

export const BUTTON_SCHEMA_TYPE = 'nova-ui.button'

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'
export type ButtonIconPlacement = 'left' | 'right' | 'top' | 'bottom' | 'only'

export interface ButtonProps extends NovaUiCommonProps {
  text?: string
  icon?: NovaUiIconSource
  trailingIcon?: NovaUiIconSource
  iconPlacement?: ButtonIconPlacement
  variant?: ButtonVariant
  size?: NovaUiComponentSize
  loading?: boolean
  selected?: boolean
  onPress?: (event?: Event) => void
}

export interface ButtonResolvedProps extends NovaUiCommonResolvedProps {
  text: string
  icon?: NovaUiIconSource
  trailingIcon?: NovaUiIconSource
  iconPlacement: ButtonIconPlacement
  variant: ButtonVariant
  size: NovaUiComponentSize
  loading: boolean
  selected: boolean
  onPress?: (event?: Event) => void
}

export type ButtonSchema = NovaComponentSchema<ButtonProps>

export interface ButtonApi {
  press: (event?: Event) => void
  setProps: (patch: ButtonProps) => void
  setDisabled: (disabled: boolean) => void
  setSelected: (selected: boolean) => void
  getProps: () => Readonly<ButtonResolvedProps>
}
