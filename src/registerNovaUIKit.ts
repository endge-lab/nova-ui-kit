import type { NovaComponentDescriptor, NovaSchemaRegistry } from '@endge/nova'
import { ADVANCED_COMPONENT_DESCRIPTORS } from '@/components/Advanced/advanced.registry'
import { BUTTON_DESCRIPTOR } from '@/components/Button/button.registry'
import { CHECKBOX_DESCRIPTOR } from '@/components/Checkbox/checkbox.registry'
import { FLEX_DESCRIPTOR } from '@/components/Flex/flex.registry'
import { GRID_DESCRIPTOR } from '@/components/Grid/grid.registry'
import { PANEL_DESCRIPTOR } from '@/components/Panel/panel.registry'
import { ROOT_DESCRIPTOR } from '@/components/Root/root.registry'
import { SCROLL_AREA_DESCRIPTOR } from '@/components/ScrollArea/scroll-area.registry'
import { SCROLLBAR_DESCRIPTOR } from '@/components/Scrollbar/scrollbar.registry'
import { SEGMENTED_CONTROL_DESCRIPTOR } from '@/components/SegmentedControl/segmented-control.registry'
import { SLIDER_DESCRIPTOR } from '@/components/Slider/slider.registry'
import { SPLIT_PANE_DESCRIPTOR } from '@/components/SplitPane/split-pane.registry'
import { SURFACE_DESCRIPTOR } from '@/components/Surface/surface.registry'
import { TAG_DESCRIPTOR } from '@/components/Tag/tag.registry'
import { TEXT_BLOCK_DESCRIPTOR } from '@/components/TextBlock/text-block.registry'
import { TOGGLE_DESCRIPTOR } from '@/components/Toggle/toggle.registry'
import { TOOLTIP_DESCRIPTOR } from '@/components/Tooltip/tooltip.registry'

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
