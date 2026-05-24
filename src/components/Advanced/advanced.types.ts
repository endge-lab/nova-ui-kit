import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps, NovaUiIconSource, NovaUiOrientation } from '@/shared/component'
import type { NovaUiPartStyleOptions } from '@/domain/domain.types'

export const SPEED_DIAL_SCHEMA_TYPE = 'nova-ui.speed-dial'
export const DOCK_SCHEMA_TYPE = 'nova-ui.dock'
export const CAROUSEL_SCHEMA_TYPE = 'nova-ui.carousel'
export const GALLERIA_SCHEMA_TYPE = 'nova-ui.galleria'
export const IMAGE_PREVIEW_SCHEMA_TYPE = 'nova-ui.image-preview'
export const IMAGE_COMPARE_SCHEMA_TYPE = 'nova-ui.image-compare'
export const SKELETON_SCHEMA_TYPE = 'nova-ui.skeleton'
export const PROGRESS_BAR_SCHEMA_TYPE = 'nova-ui.progress-bar'
export const PROGRESS_SPINNER_SCHEMA_TYPE = 'nova-ui.progress-spinner'
export const METER_GROUP_SCHEMA_TYPE = 'nova-ui.meter-group'
export const KNOB_SCHEMA_TYPE = 'nova-ui.knob'
export const TOGGLE_SWITCH_SCHEMA_TYPE = 'nova-ui.toggle-switch'
export const RADIO_BUTTON_SCHEMA_TYPE = 'nova-ui.radio-button'
export const RATING_SCHEMA_TYPE = 'nova-ui.rating'
export const SELECT_BUTTON_SCHEMA_TYPE = 'nova-ui.select-button'
export const DRAWER_SCHEMA_TYPE = 'nova-ui.drawer'
export const MESSAGE_SCHEMA_TYPE = 'nova-ui.message'
export const BLOCK_UI_SCHEMA_TYPE = 'nova-ui.block-ui'
export const ACCORDION_SCHEMA_TYPE = 'nova-ui.accordion'
export const FIELDSET_SCHEMA_TYPE = 'nova-ui.fieldset'
export const TABS_SCHEMA_TYPE = 'nova-ui.tabs'
export const STEPPER_SCHEMA_TYPE = 'nova-ui.stepper'

export type AdvancedComponentKind =
  | 'SpeedDial'
  | 'Dock'
  | 'Carousel'
  | 'Galleria'
  | 'ImagePreview'
  | 'ImageCompare'
  | 'Skeleton'
  | 'ProgressBar'
  | 'ProgressSpinner'
  | 'MeterGroup'
  | 'Knob'
  | 'ToggleSwitch'
  | 'RadioButton'
  | 'Rating'
  | 'SelectButton'
  | 'Drawer'
  | 'Message'
  | 'BlockUI'
  | 'Accordion'
  | 'Fieldset'
  | 'Tabs'
  | 'Stepper'

export type AdvancedSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger'
export type AdvancedDirection = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right'

export interface AdvancedItem {
  label?: string
  value?: string
  icon?: NovaUiIconSource
  color?: string
  disabled?: boolean
}

export interface AdvancedComponentProps extends NovaUiCommonProps, NovaUiPartStyleOptions {
  title?: string
  subtitle?: string
  text?: string
  value?: number | string | boolean
  max?: number
  min?: number
  items?: Array<AdvancedItem>
  activeIndex?: number
  open?: boolean
  checked?: boolean
  expanded?: boolean
  blocked?: boolean
  severity?: AdvancedSeverity
  orientation?: NovaUiOrientation
  direction?: AdvancedDirection
  mode?: string
  image?: NovaUiIconSource
  compareImage?: NovaUiIconSource
  rating?: number
  autoPlay?: boolean
  animation?: false | 'fade' | 'slide' | 'scale' | 'radial' | 'shimmer' | 'spring' | 'meterSweep' | 'activeIndicator' | 'maskFade' | 'stepAdvance'
  onChange?: (value: number | string | boolean, event?: Event) => void
  onValueChange?: (value: number | string | boolean, event?: Event) => void
  onInput?: (value: number | string | boolean, event?: Event) => void
  onPress?: (item: AdvancedItem, index: number, event?: Event) => void
  onOpenChange?: (open: boolean, event?: Event) => void
  onShow?: (event?: Event) => void
  onHide?: (event?: Event) => void
  onStepChange?: (activeIndex: number, event?: Event) => void
}

export interface AdvancedComponentResolvedProps extends NovaUiCommonResolvedProps, NovaUiPartStyleOptions {
  kind: AdvancedComponentKind
  title: string
  subtitle: string
  text: string
  value: number | string | boolean
  max: number
  min: number
  items: Array<AdvancedItem>
  activeIndex: number
  open: boolean
  checked: boolean
  expanded: boolean
  blocked: boolean
  severity: AdvancedSeverity
  orientation: NovaUiOrientation
  direction: AdvancedDirection
  mode: string
  image?: NovaUiIconSource
  compareImage?: NovaUiIconSource
  rating: number
  autoPlay: boolean
  animation: false | 'fade' | 'slide' | 'scale' | 'radial' | 'shimmer' | 'spring' | 'meterSweep' | 'activeIndicator' | 'maskFade' | 'stepAdvance'
  onChange?: (value: number | string | boolean, event?: Event) => void
  onValueChange?: (value: number | string | boolean, event?: Event) => void
  onInput?: (value: number | string | boolean, event?: Event) => void
  onPress?: (item: AdvancedItem, index: number, event?: Event) => void
  onOpenChange?: (open: boolean, event?: Event) => void
  onShow?: (event?: Event) => void
  onHide?: (event?: Event) => void
  onStepChange?: (activeIndex: number, event?: Event) => void
}

export interface AdvancedComponentApi {
  setProps: (patch: AdvancedComponentProps) => void
  setValue: (value: number | string | boolean, event?: Event) => void
  setOpen: (open: boolean, event?: Event) => void
  toggle: (event?: Event) => void
  getProps: () => Readonly<AdvancedComponentResolvedProps>
}

export type AdvancedComponentSchema = NovaComponentSchema<AdvancedComponentProps>
