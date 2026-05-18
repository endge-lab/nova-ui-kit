import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps, NovaUiOrientation } from '@/shared/component'

export const SLIDER_SCHEMA_TYPE = 'nova-ui.slider'

export interface SliderMark {
  value: number
  label?: string
}

export interface SliderProps extends NovaUiCommonProps {
  min?: number
  max?: number
  step?: number
  value?: number
  orientation?: NovaUiOrientation
  marks?: Array<SliderMark>
  onChange?: (value: number, event?: Event) => void
  onValueChange?: (value: number, event?: Event) => void
  onInput?: (value: number, event?: Event) => void
  onDragStart?: (value: number, event: MouseEvent) => void
  onDragEnd?: (value: number, event: MouseEvent) => void
}

export interface SliderResolvedProps extends NovaUiCommonResolvedProps {
  min: number
  max: number
  step: number
  value: number
  orientation: NovaUiOrientation
  marks: Array<SliderMark>
  onChange?: (value: number, event?: Event) => void
  onValueChange?: (value: number, event?: Event) => void
  onInput?: (value: number, event?: Event) => void
  onDragStart?: (value: number, event: MouseEvent) => void
  onDragEnd?: (value: number, event: MouseEvent) => void
}

export type SliderSchema = NovaComponentSchema<SliderProps>

export interface SliderApi {
  setValue: (value: number, event?: Event) => void
  setProps: (patch: SliderProps) => void
  getProps: () => Readonly<SliderResolvedProps>
}
