import type { NovaComponentSchema } from '@endge/nova'
import type {
  NovaUiLayoutRect,
  NovaUiLayoutValue,
  NovaUiSpacing,
} from '@/shared/layout'
import type {
  NovaUiBorder,
  NovaUiInheritedTextStyle,
} from '@/shared/style'
import type { NovaUiMotionOptions } from '@/domain/types'

/** Schema type для сеточного layout-компонента. */
export const GRID_SCHEMA_TYPE = 'nova-ui.grid'

export type GridAlign = 'start' | 'center' | 'end' | 'stretch'

/** Параметры Grid контейнера. */
export interface GridProps extends NovaUiMotionOptions {
  x?: number
  y?: number
  width?: number
  height?: number
  responsive?: boolean
  columns?: number
  minColumns?: number
  maxColumns?: number
  minColumnWidth?: number
  gap?: number
  rowGap?: number
  columnGap?: number
  padding?: NovaUiSpacing
  rowHeight?: NovaUiLayoutValue
  alignItems?: GridAlign
  justifyItems?: GridAlign
  style?: NovaUiInheritedTextStyle
  background?: string
  border?: NovaUiBorder
  clip?: boolean
}

/** Нормализованные параметры Grid контейнера. */
export interface GridResolvedProps {
  x: number
  y: number
  width: number
  height: number
  responsive: boolean
  columns: number
  minColumns: number
  maxColumns: number
  minColumnWidth: number
  gap: number
  rowGap: number
  columnGap: number
  padding: NovaUiSpacing
  rowHeight: NovaUiLayoutValue
  alignItems: GridAlign
  justifyItems: GridAlign
  style?: NovaUiInheritedTextStyle
  background?: string
  border?: NovaUiBorder
  clip: boolean
}

/** Layout-намерение ребенка внутри Grid. Потомок сам это не читает. */
export interface GridChildLayout {
  colSpan?: number
  height?: NovaUiLayoutValue
  minHeight?: number
  maxHeight?: number
  margin?: NovaUiSpacing
  alignSelf?: GridAlign
  justifySelf?: GridAlign
  order?: number
}

/** Schema ребенка Grid с отдельным layout-блоком. */
export interface GridChildSchema<TProps = Record<string, any>> extends NovaComponentSchema<TProps> {
  layout?: GridChildLayout
}

/** Schema Grid контейнера с вложенными детьми. */
export interface GridSchema extends NovaComponentSchema<GridProps> {
  children?: GridChildSchema[]
}

/** Публичный API Grid для runtime-управления детьми и relayout. */
export interface GridApi {
  setChildren: (children: GridChildSchema[]) => void
  setChildLayout: (id: string, layout: GridChildLayout) => void
  relayout: () => void
  getChildRect: (id: string) => Readonly<NovaUiLayoutRect> | undefined
  getColumnCount: () => number
}
