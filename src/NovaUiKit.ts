import { BUTTON_SCHEMA_TYPE } from '@/components/Button/Button.types'
import { CHECKBOX_SCHEMA_TYPE } from '@/components/Checkbox/Checkbox.types'
import { FLEX_SCHEMA_TYPE } from '@/components/Flex/Flex.types'
import { GRID_SCHEMA_TYPE } from '@/components/Grid/Grid.types'
import { PANEL_SCHEMA_TYPE } from '@/components/Panel/Panel.types'
import { ROOT_SCHEMA_TYPE } from '@/components/Root/Root.types'
import { SCROLL_AREA_SCHEMA_TYPE } from '@/components/ScrollArea/ScrollArea.types'
import { SCROLLBAR_SCHEMA_TYPE } from '@/components/Scrollbar/Scrollbar.types'
import { SEGMENTED_CONTROL_SCHEMA_TYPE } from '@/components/SegmentedControl/SegmentedControl.types'
import { SLIDER_SCHEMA_TYPE } from '@/components/Slider/Slider.types'
import { SPLIT_PANE_SCHEMA_TYPE } from '@/components/SplitPane/SplitPane.types'
import { SURFACE_SCHEMA_TYPE } from '@/components/Surface/Surface.types'
import { TAG_SCHEMA_TYPE } from '@/components/Tag/Tag.types'
import { TEXT_BLOCK_SCHEMA_TYPE } from '@/components/TextBlock/TextBlock.types'
import { TOGGLE_SCHEMA_TYPE } from '@/components/Toggle/Toggle.types'
import { TOOLTIP_SCHEMA_TYPE } from '@/components/Tooltip/Tooltip.types'

/** Группировка schema type для более читаемого UI Kit DSL. */
export const NovaUiKit = {
  Root: ROOT_SCHEMA_TYPE,
  Flex: FLEX_SCHEMA_TYPE,
  Grid: GRID_SCHEMA_TYPE,
  TextBlock: TEXT_BLOCK_SCHEMA_TYPE,
  Surface: SURFACE_SCHEMA_TYPE,
  Button: BUTTON_SCHEMA_TYPE,
  Tag: TAG_SCHEMA_TYPE,
  SplitPane: SPLIT_PANE_SCHEMA_TYPE,
  ScrollArea: SCROLL_AREA_SCHEMA_TYPE,
  Scrollbar: SCROLLBAR_SCHEMA_TYPE,
  Slider: SLIDER_SCHEMA_TYPE,
  Checkbox: CHECKBOX_SCHEMA_TYPE,
  Toggle: TOGGLE_SCHEMA_TYPE,
  Tooltip: TOOLTIP_SCHEMA_TYPE,
  SegmentedControl: SEGMENTED_CONTROL_SCHEMA_TYPE,
  Panel: PANEL_SCHEMA_TYPE,
} as const
