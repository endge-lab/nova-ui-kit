import type { NovaBounds, NovaComponentSchema, NovaStylePadding, NovaText } from '@endge/nova'

export const TEXT_BLOCK_SCHEMA_TYPE = 'nova-ui.text-block'

export type TextBlockFontWeight = NonNullable<NonNullable<NovaText['styles']>['font']>['weight']
export type TextBlockFontStyle = 'normal' | 'italic'
export type TextBlockAlign = 'left' | 'center' | 'right'
export type TextBlockVerticalAlign = 'top' | 'middle' | 'bottom'
export type TextBlockWhiteSpace = 'normal' | 'nowrap' | 'pre' | 'pre-wrap'
export type TextBlockOverflow = 'visible' | 'clip' | 'ellipsis'
export type TextBlockWordBreak = 'normal' | 'break-word' | 'break-all'

export interface TextBlockBorder {
  color?: string
  width?: number
  radius?: number
}

export interface TextBlockProps {
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
  padding?: NovaStylePadding | number
  align?: TextBlockAlign
  verticalAlign?: TextBlockVerticalAlign
  whiteSpace?: TextBlockWhiteSpace
  overflow?: TextBlockOverflow
  maxLines?: number
  wordBreak?: TextBlockWordBreak
  background?: string
  border?: TextBlockBorder
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
  background?: string
  border?: TextBlockBorder
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
  lines: TextBlockLayoutLine[]
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
  getLines: () => readonly TextBlockLayoutLine[]
  isOverflowed: () => boolean
}

export type TextBlockSchema = NovaComponentSchema<TextBlockProps>
