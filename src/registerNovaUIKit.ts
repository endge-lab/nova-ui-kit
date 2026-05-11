import type { NovaComponentDescriptor, NovaSchemaRegistry } from '@endge/nova'
import { ADVANCED_COMPONENT_DESCRIPTORS } from '@/components/Advanced/Advanced.registry'
import { BUTTON_DESCRIPTOR } from '@/components/Button/Button.registry'
import { CHECKBOX_DESCRIPTOR } from '@/components/Checkbox/Checkbox.registry'
import { FLEX_DESCRIPTOR } from '@/components/Flex/Flex.registry'
import { GRID_DESCRIPTOR } from '@/components/Grid/Grid.registry'
import { PANEL_DESCRIPTOR } from '@/components/Panel/Panel.registry'
import { ROOT_DESCRIPTOR } from '@/components/Root/Root.registry'
import { SCROLL_AREA_DESCRIPTOR } from '@/components/ScrollArea/ScrollArea.registry'
import { SCROLLBAR_DESCRIPTOR } from '@/components/Scrollbar/Scrollbar.registry'
import { SEGMENTED_CONTROL_DESCRIPTOR } from '@/components/SegmentedControl/SegmentedControl.registry'
import { SLIDER_DESCRIPTOR } from '@/components/Slider/Slider.registry'
import { SPLIT_PANE_DESCRIPTOR } from '@/components/SplitPane/SplitPane.registry'
import { SURFACE_DESCRIPTOR } from '@/components/Surface/Surface.registry'
import { TAG_DESCRIPTOR } from '@/components/Tag/Tag.registry'
import { TEXT_BLOCK_DESCRIPTOR } from '@/components/TextBlock/TextBlock.registry'
import { TOGGLE_DESCRIPTOR } from '@/components/Toggle/Toggle.registry'
import { TOOLTIP_DESCRIPTOR } from '@/components/Tooltip/Tooltip.registry'

const NOVA_UI_KIT_DESCRIPTORS: Array<NovaComponentDescriptor<any, any, any, any>> = [
  ROOT_DESCRIPTOR,
  FLEX_DESCRIPTOR,
  GRID_DESCRIPTOR,
  TEXT_BLOCK_DESCRIPTOR,
  SURFACE_DESCRIPTOR,
  BUTTON_DESCRIPTOR,
  TAG_DESCRIPTOR,
  SCROLLBAR_DESCRIPTOR,
  SCROLL_AREA_DESCRIPTOR,
  SLIDER_DESCRIPTOR,
  CHECKBOX_DESCRIPTOR,
  TOGGLE_DESCRIPTOR,
  SEGMENTED_CONTROL_DESCRIPTOR,
  SPLIT_PANE_DESCRIPTOR,
  TOOLTIP_DESCRIPTOR,
  PANEL_DESCRIPTOR,
  ...ADVANCED_COMPONENT_DESCRIPTORS,
]

export function registerNovaUIKit(registry: NovaSchemaRegistry): void {
  for (const descriptor of NOVA_UI_KIT_DESCRIPTORS) {
    registry.reserveTag(descriptor.name)
    registry.register(descriptor, { override: true })
  }
}
