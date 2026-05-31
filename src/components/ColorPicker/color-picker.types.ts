import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps } from '@/shared/component'

export const COLOR_PICKER_SCHEMA_TYPE = 'nova-ui.color-picker'

export type ColorPickerFormat = 'hex' | 'rgba'
export type ColorPickerChangeSource = 'preset' | 'custom' | 'input'
export type ColorPickerFieldId = 'hex' | 'r' | 'g' | 'b' | 'a'

export interface ColorPickerPreset {
  id: string
  value: string
  label?: string
  borderColor?: string
}

export interface ColorPickerValueContext {
  source: ColorPickerChangeSource
  preset?: ColorPickerPreset
  event?: Event
}

export interface ColorPickerProps extends NovaUiCommonProps {
  value?: string
  presets?: Array<ColorPickerPreset>
  customOpen?: boolean
  format?: ColorPickerFormat
  allowAlpha?: boolean
  onValueChange?: (value: string, context: ColorPickerValueContext) => void
  onCommit?: (value: string, context: ColorPickerValueContext) => void
  onCustomOpenChange?: (open: boolean, event?: Event) => void
}

export interface ColorPickerResolvedProps extends NovaUiCommonResolvedProps {
  value: string
  presets: Array<ColorPickerPreset>
  customOpen: boolean
  format: ColorPickerFormat
  allowAlpha: boolean
  onValueChange?: ColorPickerProps['onValueChange']
  onCommit?: ColorPickerProps['onCommit']
  onCustomOpenChange?: ColorPickerProps['onCustomOpenChange']
}

export type ColorPickerSchema = NovaComponentSchema<ColorPickerProps>

export interface ColorPickerApi {
  setValue: (value: string, event?: Event) => void
  setCustomOpen: (open: boolean, event?: Event) => void
  getValue: () => string
  setProps: (patch: ColorPickerProps) => void
  getProps: () => Readonly<ColorPickerResolvedProps>
}
