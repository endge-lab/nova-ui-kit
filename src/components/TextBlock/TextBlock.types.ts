import type { NovaBounds, NovaComponentSchema, NovaText } from '@endge/nova'
import type {
  NovaUiBorder,
  NovaUiFontStyle,
  NovaUiInheritedTextStyle,
  NovaUiStyleIdentityProps,
} from '@/shared/style'
import type { NovaUiSpacing } from '@/shared/layout'
import type { NovaUiMotionOptions } from '@/domain/domain.types'

export const TEXT_BLOCK_SCHEMA_TYPE = 'nova-ui.text-block'

export type TextBlockFontWeight = NonNullable<NonNullable<NovaText['styles']>['font']>['weight']
export type TextBlockFontStyle = NovaUiFontStyle
export type TextBlockAlign = 'left' | 'center' | 'right'
export type TextBlockVerticalAlign = 'top' | 'middle' | 'bottom'
export type TextBlockWhiteSpace = 'normal' | 'nowrap' | 'pre' | 'pre-wrap'
export type TextBlockOverflow = 'visible' | 'clip' | 'ellipsis'
export type TextBlockWordBreak = 'normal' | 'break-word' | 'break-all'

export interface TextBlockProps extends NovaUiMotionOptions, NovaUiStyleIdentityProps {
  text?: string
  x?: number
  y?: number
  width?: number
  height?: number
  color?: string
  opacity?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: TextBlockFontWeight
  fontStyle?: TextBlockFontStyle
  lineHeight?: number
  padding?: NovaUiSpacing
  align?: TextBlockAlign
  verticalAlign?: TextBlockVerticalAlign
  whiteSpace?: TextBlockWhiteSpace
  overflow?: TextBlockOverflow
  maxLines?: number
  wordBreak?: TextBlockWordBreak
  style?: NovaUiInheritedTextStyle
  background?: string
  border?: NovaUiBorder
}

export interface TextBlockResolvedPadding {
  left: number
  right: number
  top: number
  bottom: number
}

export interface TextBlockResolvedProps {
  text: string
  x: number
  y: number
  width: number
  height: number
  color: string
  opacity: number
  fontFamily: string
  fontSize: number
  fontWeight: TextBlockFontWeight
  fontStyle: TextBlockFontStyle
  lineHeight: number
  padding: TextBlockResolvedPadding
  align: TextBlockAlign
  verticalAlign: TextBlockVerticalAlign
  whiteSpace: TextBlockWhiteSpace
  overflow: TextBlockOverflow
  maxLines: number
  wordBreak: TextBlockWordBreak
  style?: NovaUiInheritedTextStyle
  background?: string
  border?: NovaUiBorder
  className?: string | Array<string>
  attrs?: NovaUiStyleIdentityProps['attrs']
}

export interface TextBlockLayoutLine {
  text: string
  width: number
  x: number
  y: number
  widthLimit: number
  height: number
}

export interface TextBlockLayout {
  bounds: NovaBounds
  contentWidth: number
  contentHeight: number
  lines: Array<TextBlockLayoutLine>
  sourceLineCount: number
  overflowed: boolean
}

export interface TextBlockMeasureOptions {
  fontFamily: string
  fontSize: number
  fontWeight: TextBlockFontWeight
  fontStyle: TextBlockFontStyle
}

export type TextBlockMeasureFn = (text: string, options: TextBlockMeasureOptions) => number

export interface TextBlockApi {
  setText: (text: string) => void
  setProps: (patch: TextBlockProps) => void
  getProps: () => Readonly<TextBlockResolvedProps>
  measure: () => TextBlockLayout
  getLines: () => ReadonlyArray<TextBlockLayoutLine>
  isOverflowed: () => boolean
}

export type TextBlockSchema = NovaComponentSchema<TextBlockProps>
