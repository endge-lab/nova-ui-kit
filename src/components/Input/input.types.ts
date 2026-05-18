import type { NovaComponentSchema, NovaInputEngine, NovaInputValidationResult } from '@endge/nova'
import type {
  NovaUiCommonProps,
  NovaUiCommonResolvedProps,
  NovaUiComponentSize,
  NovaUiIconSource,
} from '@/shared/component/component-props'

export const INPUT_SCHEMA_TYPE = 'nova-ui.input'
export const TEXT_INPUT_SCHEMA_TYPE = 'nova-ui.text-input'
export const PASSWORD_INPUT_SCHEMA_TYPE = 'nova-ui.password-input'
export const SEARCH_INPUT_SCHEMA_TYPE = 'nova-ui.search-input'
export const NUMBER_INPUT_SCHEMA_TYPE = 'nova-ui.number-input'
export const TEXT_AREA_SCHEMA_TYPE = 'nova-ui.textarea'
export const INPUT_FIELD_SCHEMA_TYPE = 'nova-ui.input-field'
export const SELECT_INPUT_SCHEMA_TYPE = 'nova-ui.select-input'

export type InputVariant = 'default' | 'filled' | 'ghost' | 'underline'
export type InputAlign = 'left' | 'center' | 'right'
export type InputValidationMode = 'onChange' | 'onBlur' | 'onCommit' | 'manual'
export type InputComponentKind = 'input' | 'text' | 'password' | 'search' | 'number' | 'textarea' | 'field' | 'select'

export interface SelectInputOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface InputValueContext {
  event?: Event
  reason?: string
  component: InputComponentKind
}

export interface InputProps extends NovaUiCommonProps {
  value?: string | number
  defaultValue?: string | number
  placeholder?: string
  readonly?: boolean
  required?: boolean
  autofocus?: boolean
  inputEngine?: NovaInputEngine
  size?: NovaUiComponentSize
  variant?: InputVariant
  align?: InputAlign
  maxLength?: number
  selectOnFocus?: boolean
  clearable?: boolean
  validation?: InputValidationMode
  validate?: (value: unknown, context: InputValueContext) => NovaInputValidationResult | Promise<NovaInputValidationResult>
  format?: (value: unknown, context: InputValueContext) => string
  parse?: (text: string, context: InputValueContext) => unknown
  onValueChange?: (value: unknown, context: InputValueContext) => void
  onCommit?: (value: unknown, context: InputValueContext) => void
  onCancel?: (context: InputValueContext) => void
  onValidationChange?: (result: NovaInputValidationResult, context: InputValueContext) => void
  icon?: NovaUiIconSource
  prefix?: string
  suffix?: string
  selectionColor?: string
  caretColor?: string
  placeholderColor?: string
  focusBorderColor?: string
  errorColor?: string
  revealable?: boolean
  onSearch?: (query: string, context: InputValueContext) => void
  min?: number
  max?: number
  step?: number
  precision?: number
  minRows?: number
  maxRows?: number
  wrap?: boolean
  resize?: 'none' | 'vertical' | 'both'
  label?: string
  hint?: string
  error?: string
  options?: Array<SelectInputOption>
  opened?: boolean
}

export interface InputResolvedProps extends NovaUiCommonResolvedProps {
  value: string | number | undefined
  defaultValue: string | number | undefined
  placeholder: string
  readonly: boolean
  required: boolean
  autofocus: boolean
  inputEngine: NovaInputEngine
  size: NovaUiComponentSize
  variant: InputVariant
  align: InputAlign
  maxLength?: number
  selectOnFocus: boolean
  clearable: boolean
  validation: InputValidationMode
  validate?: InputProps['validate']
  format?: InputProps['format']
  parse?: InputProps['parse']
  onValueChange?: InputProps['onValueChange']
  onCommit?: InputProps['onCommit']
  onCancel?: InputProps['onCancel']
  onValidationChange?: InputProps['onValidationChange']
  icon?: NovaUiIconSource
  prefix?: string
  suffix?: string
  selectionColor: string
  caretColor: string
  placeholderColor: string
  focusBorderColor: string
  errorColor: string
  revealable: boolean
  onSearch?: InputProps['onSearch']
  min?: number
  max?: number
  step: number
  precision?: number
  minRows: number
  maxRows: number
  wrap: boolean
  resize: 'none' | 'vertical' | 'both'
  label?: string
  hint?: string
  error?: string
  options: Array<SelectInputOption>
  opened: boolean
}

export type InputSchema = NovaComponentSchema<InputProps>
export type TextInputSchema = NovaComponentSchema<InputProps>
export type PasswordInputSchema = NovaComponentSchema<InputProps>
export type SearchInputSchema = NovaComponentSchema<InputProps>
export type NumberInputSchema = NovaComponentSchema<InputProps>
export type TextAreaSchema = NovaComponentSchema<InputProps>
export type InputFieldSchema = NovaComponentSchema<InputProps>
export type SelectInputSchema = NovaComponentSchema<InputProps>

export interface InputApi {
  focus: () => void
  blur: () => void
  select: (start?: number, end?: number) => void
  selectAll: () => void
  setValue: (value: string | number, event?: Event) => void
  commit: (event?: Event) => void
  cancel: (event?: Event) => void
  validate: () => Promise<NovaInputValidationResult>
  getState: () => {
    value: unknown
    draft: string
    focused: boolean
    dirty: boolean
    touched: boolean
    invalid: boolean
    validationMessage?: string
    inputEngine: NovaInputEngine
  }
  getSelection: () => { start: number; end: number }
  getCaretRect: () => { x: number; y: number; width: number; height: number }
  setProps: (patch: InputProps) => void
  getProps: () => Readonly<InputResolvedProps>
}
