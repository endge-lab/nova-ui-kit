import type { NovaComponentSchema } from '@endge/nova'
import type { NovaUiCommonProps, NovaUiCommonResolvedProps, NovaUiComponentSize, NovaUiIconSource } from '@/shared/component'
import type { NovaUiPartStyleOptions } from '@/domain/domain.types'

export const CHIP_SCHEMA_TYPE = 'nova-ui.chip'
export interface ChipProps extends NovaUiCommonProps, NovaUiPartStyleOptions { label?: string; icon?: NovaUiIconSource; avatar?: NovaUiIconSource; selected?: boolean; removable?: boolean; tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'; size?: NovaUiComponentSize; onPress?: (event?: Event) => void; onRemove?: (event?: Event) => void }
export interface ChipResolvedProps extends NovaUiCommonResolvedProps, NovaUiPartStyleOptions { label: string; icon?: NovaUiIconSource; avatar?: NovaUiIconSource; selected: boolean; removable: boolean; tone: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'; size: NovaUiComponentSize; onPress?: (event?: Event) => void; onRemove?: (event?: Event) => void }
export type ChipSchema = NovaComponentSchema<ChipProps>
export interface ChipApi { press: (event?: Event) => void; remove: (event?: Event) => void; setProps: (patch: ChipProps) => void; setSelected: (selected: boolean) => void; getProps: () => Readonly<ChipResolvedProps> }
