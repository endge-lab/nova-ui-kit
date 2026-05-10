import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps, NovaUiIconSource } from '@/shared/component'

export const SEGMENTED_CONTROL_SCHEMA_TYPE = 'nova-ui.segmented-control'

export interface SegmentedControlItem {
  value: string
  label: string
  icon?: NovaUiIconSource
  disabled?: boolean
}

export interface SegmentedControlProps extends NovaUiCommonProps {
  items?: Array<SegmentedControlItem>
  value?: string
  size?: 'sm' | 'md' | 'lg'
  onChange?: (value: string, event?: Event) => void
}

export interface SegmentedControlResolvedProps extends NovaUiCommonResolvedProps {
  items: Array<SegmentedControlItem>
  value: string
  size: 'sm' | 'md' | 'lg'
  onChange?: (value: string, event?: Event) => void
}

export type SegmentedControlSchema = NovaComponentSchema<SegmentedControlProps>

export interface SegmentedControlApi {
  setValue: (value: string, event?: Event) => void
  setProps: (patch: SegmentedControlProps) => void
  getProps: () => Readonly<SegmentedControlResolvedProps>
}
