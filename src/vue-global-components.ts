import type {} from 'vue'
import type { AdvancedComponentProps } from '@/components/Advanced/advanced.types'
import type { ButtonProps } from '@/components/Button/button.types'
import type { CheckboxProps } from '@/components/Checkbox/checkbox.types'
import type { FlexChildLayout, FlexProps } from '@/components/Flex/flex.types'
import type { GridChildLayout, GridProps } from '@/components/Grid/grid.types'
import type { PanelProps } from '@/components/Panel/panel.types'
import type { RootProps } from '@/components/Root/root.types'
import type { ScrollAreaProps } from '@/components/ScrollArea/scroll-area.types'
import type { ScrollbarProps } from '@/components/Scrollbar/scrollbar.types'
import type { SegmentedControlProps } from '@/components/SegmentedControl/segmented-control.types'
import type { SliderProps } from '@/components/Slider/slider.types'
import type { SplitPaneProps } from '@/components/SplitPane/split-pane.types'
import type { SurfaceProps } from '@/components/Surface/surface.types'
import type { TagProps } from '@/components/Tag/tag.types'
import type { TextBlockProps } from '@/components/TextBlock/text-block.types'
import type { ToggleProps } from '@/components/Toggle/toggle.types'
import type { TooltipProps } from '@/components/Tooltip/tooltip.types'

type NovaDslClassValue = string | Array<string | Record<string, boolean>> | Record<string, boolean>
type NovaDslLayout = FlexChildLayout | GridChildLayout | Record<string, unknown>

interface NovaDslControlFlowProps {
  if?: unknown
  'else-if'?: unknown
  else?: boolean | ''
  for?: string
}

interface NovaDslRuntimeProps extends NovaDslControlFlowProps {
  id?: string
  key?: string | number
  ref?: string
  refKey?: string
  'ref-key'?: string
  context?: Record<string, unknown>
  layout?: NovaDslLayout
  class?: NovaDslClassValue
  attrs?: Record<string, unknown>
}

type NovaDslComponent<TProps> = {
  new (): {
    $props: TProps & NovaDslRuntimeProps
    $slots: {
      default?: () => unknown
      [name: string]: ((scope?: Record<string, unknown>) => unknown) | undefined
    }
  }
}

declare module 'vue' {
  export interface GlobalComponents {
    Root: NovaDslComponent<RootProps>
    Flex: NovaDslComponent<FlexProps>
    Grid: NovaDslComponent<GridProps>
    TextBlock: NovaDslComponent<TextBlockProps>
    Surface: NovaDslComponent<SurfaceProps>
    Button: NovaDslComponent<ButtonProps>
    Tag: NovaDslComponent<TagProps>
    Scrollbar: NovaDslComponent<ScrollbarProps>
    ScrollArea: NovaDslComponent<ScrollAreaProps>
    Slider: NovaDslComponent<SliderProps>
    Checkbox: NovaDslComponent<CheckboxProps>
    Toggle: NovaDslComponent<ToggleProps>
    SegmentedControl: NovaDslComponent<SegmentedControlProps>
    SplitPane: NovaDslComponent<SplitPaneProps>
    Tooltip: NovaDslComponent<TooltipProps>
    Panel: NovaDslComponent<PanelProps>
    SpeedDial: NovaDslComponent<AdvancedComponentProps>
    Dock: NovaDslComponent<AdvancedComponentProps>
    Carousel: NovaDslComponent<AdvancedComponentProps>
    Galleria: NovaDslComponent<AdvancedComponentProps>
    ImagePreview: NovaDslComponent<AdvancedComponentProps>
    ImageCompare: NovaDslComponent<AdvancedComponentProps>
    Skeleton: NovaDslComponent<AdvancedComponentProps>
    ProgressBar: NovaDslComponent<AdvancedComponentProps>
    ProgressSpinner: NovaDslComponent<AdvancedComponentProps>
    MeterGroup: NovaDslComponent<AdvancedComponentProps>
    Knob: NovaDslComponent<AdvancedComponentProps>
    ToggleSwitch: NovaDslComponent<AdvancedComponentProps>
    RadioButton: NovaDslComponent<AdvancedComponentProps>
    Rating: NovaDslComponent<AdvancedComponentProps>
    SelectButton: NovaDslComponent<AdvancedComponentProps>
    Dialog: NovaDslComponent<AdvancedComponentProps>
    Drawer: NovaDslComponent<AdvancedComponentProps>
    Popover: NovaDslComponent<AdvancedComponentProps>
    Toast: NovaDslComponent<AdvancedComponentProps>
    Message: NovaDslComponent<AdvancedComponentProps>
    BlockUI: NovaDslComponent<AdvancedComponentProps>
    Accordion: NovaDslComponent<AdvancedComponentProps>
    Fieldset: NovaDslComponent<AdvancedComponentProps>
    Tabs: NovaDslComponent<AdvancedComponentProps>
    Stepper: NovaDslComponent<AdvancedComponentProps>
  }
}

export {}
