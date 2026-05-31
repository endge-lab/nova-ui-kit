import type { NovaComponentDescriptor, NovaSchemaRegistry } from '@endge/nova'
import { ACTION_LIST_DESCRIPTOR } from '@/components/ActionList/action-list.registry'
import { ADVANCED_COMPONENT_DESCRIPTORS } from '@/components/Advanced/advanced.registry'
import { BADGE_DESCRIPTOR } from '@/components/Badge/badge.registry'
import { BUTTON_DESCRIPTOR } from '@/components/Button/button.registry'
import { CHECKBOX_DESCRIPTOR } from '@/components/Checkbox/checkbox.registry'
import { CHIP_DESCRIPTOR } from '@/components/Chip/chip.registry'
import { COLOR_PICKER_DESCRIPTOR } from '@/components/ColorPicker/color-picker.registry'
import { DIVIDER_DESCRIPTOR } from '@/components/Divider/divider.registry'
import { DIALOG_DESCRIPTOR } from '@/components/Dialog/dialog.registry'
import { DIALOGS_DESCRIPTOR } from '@/components/Dialog/dialogs.registry'
import { FLEX_DESCRIPTOR } from '@/components/Flex/flex.registry'
import { FPS_METER_DESCRIPTOR } from '@/components/FpsMeter/fps-meter.registry'
import { GRID_DESCRIPTOR } from '@/components/Grid/grid.registry'
import { IMAGE_DESCRIPTOR } from '@/components/Image/image.registry'
import { INPUT_DESCRIPTORS } from '@/components/Input/input.registry'
import { OVERLAY_DESCRIPTOR } from '@/components/Overlay/overlay.registry'
import { OVERLAYS_DESCRIPTOR } from '@/components/Overlay/overlays.registry'
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
import { THEME_SWITCH_DESCRIPTOR } from '@/components/ThemeSwitch/theme-switch.registry'
import { ZOOM_CONTROLS_DESCRIPTOR } from '@/components/ZoomControls/zoom-controls.registry'
import { POPOVER_DESCRIPTOR } from '@/components/Popover/popover.registry'
import { TOGGLE_DESCRIPTOR } from '@/components/Toggle/toggle.registry'
import { TOOLTIP_DESCRIPTOR } from '@/components/Tooltip/tooltip.registry'
import { TOOLTIPS_DESCRIPTOR } from '@/components/Tooltip/tooltips.registry'
import { TOAST_DESCRIPTOR, TOAST_REGION_DESCRIPTOR } from '@/components/Toast/toast.registry'

const NOVA_UI_KIT_DESCRIPTORS: Array<NovaComponentDescriptor<any, any, any, any>> = [
  ROOT_DESCRIPTOR,
  FLEX_DESCRIPTOR,
  FPS_METER_DESCRIPTOR,
  GRID_DESCRIPTOR,
  TEXT_BLOCK_DESCRIPTOR,
  SURFACE_DESCRIPTOR,
  DIVIDER_DESCRIPTOR,
  BUTTON_DESCRIPTOR,
  BADGE_DESCRIPTOR,
  ...INPUT_DESCRIPTORS,
  IMAGE_DESCRIPTOR,
  TAG_DESCRIPTOR,
  CHIP_DESCRIPTOR,
  COLOR_PICKER_DESCRIPTOR,
  THEME_SWITCH_DESCRIPTOR,
  ZOOM_CONTROLS_DESCRIPTOR,
  SCROLLBAR_DESCRIPTOR,
  SCROLL_AREA_DESCRIPTOR,
  SLIDER_DESCRIPTOR,
  CHECKBOX_DESCRIPTOR,
  TOGGLE_DESCRIPTOR,
  SEGMENTED_CONTROL_DESCRIPTOR,
  SPLIT_PANE_DESCRIPTOR,
  TOOLTIP_DESCRIPTOR,
  TOOLTIPS_DESCRIPTOR,
  POPOVER_DESCRIPTOR,
  ACTION_LIST_DESCRIPTOR,
  OVERLAY_DESCRIPTOR,
  OVERLAYS_DESCRIPTOR,
  DIALOG_DESCRIPTOR,
  DIALOGS_DESCRIPTOR,
  TOAST_DESCRIPTOR,
  TOAST_REGION_DESCRIPTOR,
  PANEL_DESCRIPTOR,
  ...ADVANCED_COMPONENT_DESCRIPTORS,
]

export function registerNovaUIKit(registry: NovaSchemaRegistry): void {
  for (const descriptor of NOVA_UI_KIT_DESCRIPTORS) {
    registry.reserveTag(descriptor.name)
    registry.register(descriptor, { override: true })
    registry.register({
      ...descriptor,
      type: `NovaUIKit.${descriptor.name}`,
    }, { override: true })
  }
}
