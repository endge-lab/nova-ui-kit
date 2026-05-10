import type { NovaComponentSchema } from '@endge/nova'
import type {
  NovaUiLayoutRect,
  NovaUiLayoutValue,
  NovaUiSpacing,
} from '@/shared/layout'
import type {
  NovaUiBorder,
  NovaUiInheritedTextStyle,
  NovaUiStyleIdentityProps,
} from '@/shared/style'
import type { NovaUiMotionOptions } from '@/domain/domain.types'

/** Schema type для адаптивного flex-layout компонента. */
export const FLEX_SCHEMA_TYPE = 'nova-ui.flex'

export type FlexDirection = 'row' | 'column'
export type FlexWrap = 'nowrap' | 'wrap'
export type FlexJustify = 'start' | 'center' | 'end' | 'space-between'
export type FlexAlign = 'start' | 'center' | 'end' | 'stretch'

/** Параметры Flex контейнера. */
export interface FlexProps extends NovaUiMotionOptions, NovaUiStyleIdentityProps {
  x?: number
  y?: number
  width?: number
  height?: number
  direction?: FlexDirection
  wrap?: FlexWrap
  gap?: number
  rowGap?: number
  columnGap?: number
  padding?: NovaUiSpacing
  justifyContent?: FlexJustify
  alignItems?: FlexAlign
  style?: NovaUiInheritedTextStyle
  background?: string
  border?: NovaUiBorder
  clip?: boolean
}

/** Нормализованные параметры Flex контейнера. */
export interface FlexResolvedProps {
  x: number
  y: number
  width: number
  height: number
  direction: FlexDirection
  wrap: FlexWrap
  gap: number
  rowGap: number
  columnGap: number
  padding: NovaUiSpacing
  justifyContent: FlexJustify
  alignItems: FlexAlign
  style?: NovaUiInheritedTextStyle
  background?: string
  border?: NovaUiBorder
  clip: boolean
  className?: string | string[]
  attrs?: NovaUiStyleIdentityProps['attrs']
}

/** Layout-намерение ребенка внутри Flex. Потомок сам это не читает. */
export interface FlexChildLayout {
  width?: NovaUiLayoutValue
  height?: NovaUiLayoutValue
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  flexGrow?: number
  flexShrink?: number
  flexBasis?: NovaUiLayoutValue
  margin?: NovaUiSpacing
  alignSelf?: FlexAlign
  order?: number
}

/** Schema ребенка с отдельным layout-блоком. */
export interface FlexChildSchema<TProps = Record<string, any>> extends NovaComponentSchema<TProps> {
  layout?: FlexChildLayout
}

/** Schema Flex контейнера с вложенными детьми. */
export interface FlexSchema extends NovaComponentSchema<FlexProps> {
  children?: FlexChildSchema[]
}

/** Публичный API Flex для runtime-управления детьми и relayout. */
export interface FlexApi {
  setChildren: (children: FlexChildSchema[]) => void
  setChildLayout: (id: string, layout: FlexChildLayout) => void
  relayout: () => void
  getChildRect: (id: string) => Readonly<NovaUiLayoutRect> | undefined
}
