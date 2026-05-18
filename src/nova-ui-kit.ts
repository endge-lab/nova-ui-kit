import { BUTTON_SCHEMA_TYPE } from '@/components/Button/button.types'
import { CHECKBOX_SCHEMA_TYPE } from '@/components/Checkbox/checkbox.types'
import {
  ACCORDION_SCHEMA_TYPE,
  BLOCK_UI_SCHEMA_TYPE,
  CAROUSEL_SCHEMA_TYPE,
  DIALOG_SCHEMA_TYPE,
  DOCK_SCHEMA_TYPE,
  DRAWER_SCHEMA_TYPE,
  FIELDSET_SCHEMA_TYPE,
  GALLERIA_SCHEMA_TYPE,
  IMAGE_COMPARE_SCHEMA_TYPE,
  IMAGE_PREVIEW_SCHEMA_TYPE,
  KNOB_SCHEMA_TYPE,
  MESSAGE_SCHEMA_TYPE,
  METER_GROUP_SCHEMA_TYPE,
  POPOVER_SCHEMA_TYPE,
  PROGRESS_BAR_SCHEMA_TYPE,
  PROGRESS_SPINNER_SCHEMA_TYPE,
  RADIO_BUTTON_SCHEMA_TYPE,
  RATING_SCHEMA_TYPE,
  SELECT_BUTTON_SCHEMA_TYPE,
  SKELETON_SCHEMA_TYPE,
  SPEED_DIAL_SCHEMA_TYPE,
  STEPPER_SCHEMA_TYPE,
  TABS_SCHEMA_TYPE,
  TOAST_SCHEMA_TYPE,
  TOGGLE_SWITCH_SCHEMA_TYPE,
} from '@/components/Advanced/advanced.types'
import { FLEX_SCHEMA_TYPE } from '@/components/Flex/flex.types'
import { GRID_SCHEMA_TYPE } from '@/components/Grid/grid.types'
import {
  INPUT_FIELD_SCHEMA_TYPE,
  INPUT_SCHEMA_TYPE,
  NUMBER_INPUT_SCHEMA_TYPE,
  PASSWORD_INPUT_SCHEMA_TYPE,
  SEARCH_INPUT_SCHEMA_TYPE,
  SELECT_INPUT_SCHEMA_TYPE,
  TEXT_AREA_SCHEMA_TYPE,
  TEXT_INPUT_SCHEMA_TYPE,
} from '@/components/Input/input.types'
import { PANEL_SCHEMA_TYPE } from '@/components/Panel/panel.types'
import { ROOT_SCHEMA_TYPE } from '@/components/Root/root.types'
import { SCROLL_AREA_SCHEMA_TYPE } from '@/components/ScrollArea/scroll-area.types'
import { SCROLLBAR_SCHEMA_TYPE } from '@/components/Scrollbar/scrollbar.types'
import { SEGMENTED_CONTROL_SCHEMA_TYPE } from '@/components/SegmentedControl/segmented-control.types'
import { SLIDER_SCHEMA_TYPE } from '@/components/Slider/slider.types'
import { SPLIT_PANE_SCHEMA_TYPE } from '@/components/SplitPane/split-pane.types'
import { SURFACE_SCHEMA_TYPE } from '@/components/Surface/surface.types'
import { TAG_SCHEMA_TYPE } from '@/components/Tag/tag.types'
import { TEXT_BLOCK_SCHEMA_TYPE } from '@/components/TextBlock/text-block.types'
import { TOGGLE_SCHEMA_TYPE } from '@/components/Toggle/toggle.types'
import { createTooltipSchema } from '@/components/Tooltip/tooltip.config'
import { TOOLTIP_SCHEMA_TYPE } from '@/components/Tooltip/tooltip.types'

/** Группировка schema type для более читаемого UI Kit DSL. */
export const NovaUIKit = {
  Root: ROOT_SCHEMA_TYPE,
  Flex: FLEX_SCHEMA_TYPE,
  Grid: GRID_SCHEMA_TYPE,
  TextBlock: TEXT_BLOCK_SCHEMA_TYPE,
  Surface: SURFACE_SCHEMA_TYPE,
  Button: BUTTON_SCHEMA_TYPE,
  Input: INPUT_SCHEMA_TYPE,
  TextInput: TEXT_INPUT_SCHEMA_TYPE,
  PasswordInput: PASSWORD_INPUT_SCHEMA_TYPE,
  SearchInput: SEARCH_INPUT_SCHEMA_TYPE,
  NumberInput: NUMBER_INPUT_SCHEMA_TYPE,
  TextArea: TEXT_AREA_SCHEMA_TYPE,
  InputField: INPUT_FIELD_SCHEMA_TYPE,
  SelectInput: SELECT_INPUT_SCHEMA_TYPE,
  Tag: TAG_SCHEMA_TYPE,
  SplitPane: SPLIT_PANE_SCHEMA_TYPE,
  ScrollArea: SCROLL_AREA_SCHEMA_TYPE,
  Scrollbar: SCROLLBAR_SCHEMA_TYPE,
  Slider: SLIDER_SCHEMA_TYPE,
  Checkbox: CHECKBOX_SCHEMA_TYPE,
  Toggle: TOGGLE_SCHEMA_TYPE,
  Tooltip: TOOLTIP_SCHEMA_TYPE,
  tooltipSchema: createTooltipSchema,
  SegmentedControl: SEGMENTED_CONTROL_SCHEMA_TYPE,
  Panel: PANEL_SCHEMA_TYPE,
  SpeedDial: SPEED_DIAL_SCHEMA_TYPE,
  Dock: DOCK_SCHEMA_TYPE,
  Carousel: CAROUSEL_SCHEMA_TYPE,
  Galleria: GALLERIA_SCHEMA_TYPE,
  ImagePreview: IMAGE_PREVIEW_SCHEMA_TYPE,
  ImageCompare: IMAGE_COMPARE_SCHEMA_TYPE,
  Skeleton: SKELETON_SCHEMA_TYPE,
  ProgressBar: PROGRESS_BAR_SCHEMA_TYPE,
  ProgressSpinner: PROGRESS_SPINNER_SCHEMA_TYPE,
  MeterGroup: METER_GROUP_SCHEMA_TYPE,
  Knob: KNOB_SCHEMA_TYPE,
  ToggleSwitch: TOGGLE_SWITCH_SCHEMA_TYPE,
  RadioButton: RADIO_BUTTON_SCHEMA_TYPE,
  Rating: RATING_SCHEMA_TYPE,
  SelectButton: SELECT_BUTTON_SCHEMA_TYPE,
  Dialog: DIALOG_SCHEMA_TYPE,
  Drawer: DRAWER_SCHEMA_TYPE,
  Popover: POPOVER_SCHEMA_TYPE,
  Toast: TOAST_SCHEMA_TYPE,
  Message: MESSAGE_SCHEMA_TYPE,
  BlockUI: BLOCK_UI_SCHEMA_TYPE,
  Accordion: ACCORDION_SCHEMA_TYPE,
  Fieldset: FIELDSET_SCHEMA_TYPE,
  Tabs: TABS_SCHEMA_TYPE,
  Stepper: STEPPER_SCHEMA_TYPE,
} as const
