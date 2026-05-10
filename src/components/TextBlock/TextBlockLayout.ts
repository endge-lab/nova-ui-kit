import type {
  TextBlockLayout,
  TextBlockLayoutLine,
  TextBlockMeasureFn,
  TextBlockProps,
  TextBlockResolvedPadding,
  TextBlockResolvedProps,
} from '@/components/TextBlock/TextBlock.types'
import { resolveSpacing } from '@/shared/layout'

const DEFAULT_WIDTH = 180
const DEFAULT_HEIGHT = 56
const DEFAULT_FONT_SIZE = 14
const DEFAULT_LINE_HEIGHT_RATIO = 1.3
const DEFAULT_MAX_LINES = Number.POSITIVE_INFINITY
const MAX_LAYOUT_LINES = 1000
const ELLIPSIS = '...'

export function normalizeTextBlockProps(props: TextBlockProps = {}): TextBlockResolvedProps {
  const fontSize = positiveNumber(props.fontSize ?? props.style?.fontSize, DEFAULT_FONT_SIZE)

  return {
    text: props.text ?? '',
    x: finiteNumber(props.x, 0),
    y: finiteNumber(props.y, 0),
    width: Math.max(0, finiteNumber(props.width, DEFAULT_WIDTH)),
    height: Math.max(0, finiteNumber(props.height, DEFAULT_HEIGHT)),
    color: props.color ?? props.style?.color ?? '#172033',
    opacity: clamp01(props.opacity ?? 1),
    fontFamily: props.fontFamily ?? props.style?.fontFamily ?? 'Inter, Arial, sans-serif',
    fontSize,
    fontWeight: props.fontWeight ?? props.style?.fontWeight ?? 'normal',
    fontStyle: props.fontStyle ?? props.style?.fontStyle ?? 'normal',
    lineHeight: positiveNumber(props.lineHeight ?? props.style?.lineHeight, fontSize * DEFAULT_LINE_HEIGHT_RATIO),
    padding: resolvePadding(props.padding),
    align: props.align ?? 'left',
    verticalAlign: props.verticalAlign ?? 'top',
    whiteSpace: props.whiteSpace ?? 'normal',
    overflow: props.overflow ?? 'clip',
    maxLines: normalizeMaxLines(props.maxLines),
    wordBreak: props.wordBreak ?? 'normal',
    style: props.style,
    background: props.background,
    border: props.border,
    className: props.className,
    attrs: props.attrs,
  }
}

export function layoutTextBlock(props: TextBlockResolvedProps, measureText: TextBlockMeasureFn): TextBlockLayout {
  const innerWidth = Math.max(0, props.width - props.padding.left - props.padding.right)
  const innerHeight = Math.max(0, props.height - props.padding.top - props.padding.bottom)
  const maxHeightLines = props.overflow === 'visible'
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Math.floor(innerHeight / props.lineHeight))
  const maxLines = Math.min(props.maxLines, maxHeightLines, MAX_LAYOUT_LINES)
  const sourceLines = buildSourceLines(props, innerWidth, measureText, maxLines + 1)
  const sourceLineCount = sourceLines.length
  const hasClippedLines = sourceLineCount > maxLines
  const visibleLines = sourceLines.slice(0, maxLines)
  const hasWideLine = visibleLines.some(line => line.width > innerWidth)
  const overflowed = hasClippedLines || (props.overflow !== 'visible' && hasWideLine)

  if (props.overflow === 'ellipsis' && overflowed && visibleLines.length > 0) {
    const lastIndex = visibleLines.length - 1
    const lastLine = visibleLines[lastIndex]
    visibleLines[lastIndex] = createMeasuredLine(
      fitWithEllipsis(lastLine.text, innerWidth, props, measureText, hasClippedLines),
      props,
      measureText,
    )
  }

  const contentHeight = visibleLines.length * props.lineHeight
  const yOffset = resolveVerticalOffset(props.verticalAlign, innerHeight, contentHeight)
  const lines: TextBlockLayoutLine[] = visibleLines.map((line, index) => ({
    ...line,
    x: props.padding.left,
    y: props.padding.top + yOffset + index * props.lineHeight,
    widthLimit: innerWidth,
    height: props.lineHeight,
  }))

  return {
    bounds: {
      x: 0,
      y: 0,
      width: props.width,
      height: props.height,
    },
    contentWidth: Math.max(0, ...lines.map(line => Math.min(line.width, innerWidth))),
    contentHeight,
    lines,
    sourceLineCount,
    overflowed,
  }
}

function buildSourceLines(
  props: TextBlockResolvedProps,
  innerWidth: number,
  measureText: TextBlockMeasureFn,
  limit: number,
): Array<Pick<TextBlockLayoutLine, 'text' | 'width'>> {
  if (props.whiteSpace === 'nowrap') {
    return [createMeasuredLine(collapseWhiteSpace(props.text), props, measureText)]
  }

  if (props.whiteSpace === 'pre') {
    return splitPreservedLines(props.text).slice(0, limit).map(line => createMeasuredLine(line, props, measureText))
  }

  const source = props.whiteSpace === 'normal'
    ? collapseWhiteSpace(props.text)
    : normalizeLineEndings(props.text)
  const paragraphs = props.whiteSpace === 'normal' ? [source] : splitPreservedLines(source)
  const lines: Array<Pick<TextBlockLayoutLine, 'text' | 'width'>> = []

  for (const paragraph of paragraphs) {
    const wrapped = wrapParagraph(paragraph, props, innerWidth, measureText)
    if (wrapped.length === 0) {
      lines.push(createMeasuredLine('', props, measureText))
    } else {
      lines.push(...wrapped)
    }
    if (lines.length >= limit) return lines
  }

  return lines
}

function wrapParagraph(
  paragraph: string,
  props: TextBlockResolvedProps,
  innerWidth: number,
  measureText: TextBlockMeasureFn,
): Array<Pick<TextBlockLayoutLine, 'text' | 'width'>> {
  if (innerWidth <= 0) return [createMeasuredLine('', props, measureText)]
  if (paragraph.length === 0) return [createMeasuredLine('', props, measureText)]
  if (props.wordBreak === 'break-all') return wrapByCharacters(paragraph, props, innerWidth, measureText)

  const words = props.whiteSpace === 'pre-wrap'
    ? paragraph.match(/\S+\s*|\s+/g) ?? ['']
    : paragraph.split(' ')
  const lines: Array<Pick<TextBlockLayoutLine, 'text' | 'width'>> = []
  let current = ''

  for (const rawWord of words) {
    const word = props.whiteSpace === 'pre-wrap' ? rawWord : rawWord.trim()
    if (!word) continue

    const separator = props.whiteSpace === 'pre-wrap' || current.length === 0 ? '' : ' '
    const candidate = `${current}${separator}${word}`
    if (current.length === 0 || measurePlain(candidate, props, measureText) <= innerWidth) {
      current = candidate
      continue
    }

    lines.push(createMeasuredLine(current, props, measureText))

    if (props.wordBreak === 'break-word' && measurePlain(word, props, measureText) > innerWidth) {
      const broken = wrapByCharacters(word, props, innerWidth, measureText)
      lines.push(...broken.slice(0, -1))
      current = broken[broken.length - 1]?.text ?? ''
    } else {
      current = word
    }
  }

  if (current.length > 0 || lines.length === 0) {
    lines.push(createMeasuredLine(current, props, measureText))
  }

  return lines
}

function wrapByCharacters(
  text: string,
  props: TextBlockResolvedProps,
  innerWidth: number,
  measureText: TextBlockMeasureFn,
): Array<Pick<TextBlockLayoutLine, 'text' | 'width'>> {
  const lines: Array<Pick<TextBlockLayoutLine, 'text' | 'width'>> = []
  let current = ''

  for (const char of Array.from(text)) {
    const candidate = `${current}${char}`
    if (current.length > 0 && measurePlain(candidate, props, measureText) > innerWidth) {
      lines.push(createMeasuredLine(current, props, measureText))
      current = char
    } else {
      current = candidate
    }
  }

  if (current.length > 0 || lines.length === 0) {
    lines.push(createMeasuredLine(current, props, measureText))
  }

  return lines
}

function fitWithEllipsis(
  text: string,
  innerWidth: number,
  props: TextBlockResolvedProps,
  measureText: TextBlockMeasureFn,
  force: boolean,
): string {
  if (innerWidth <= 0) return ''
  if (measurePlain(ELLIPSIS, props, measureText) > innerWidth) return ''
  if (!force && measurePlain(text, props, measureText) <= innerWidth) return text

  const chars = Array.from(text)
  let left = 0
  let right = chars.length

  while (left < right) {
    const middle = Math.ceil((left + right) / 2)
    const candidate = `${chars.slice(0, middle).join('')}${ELLIPSIS}`
    if (measurePlain(candidate, props, measureText) <= innerWidth) {
      left = middle
    } else {
      right = middle - 1
    }
  }

  return `${chars.slice(0, left).join('')}${ELLIPSIS}`
}

function createMeasuredLine(
  text: string,
  props: TextBlockResolvedProps,
  measureText: TextBlockMeasureFn,
): Pick<TextBlockLayoutLine, 'text' | 'width'> {
  return {
    text,
    width: measurePlain(text, props, measureText),
  }
}

function measurePlain(text: string, props: TextBlockResolvedProps, measureText: TextBlockMeasureFn): number {
  return measureText(text, {
    fontFamily: props.fontFamily,
    fontSize: props.fontSize,
    fontWeight: props.fontWeight,
    fontStyle: props.fontStyle,
  })
}

const resolvePadding = resolveSpacing as (padding?: TextBlockProps['padding']) => TextBlockResolvedPadding

function resolveVerticalOffset(align: TextBlockResolvedProps['verticalAlign'], innerHeight: number, contentHeight: number): number {
  const free = Math.max(0, innerHeight - contentHeight)
  if (align === 'bottom') return free
  if (align === 'middle') return free / 2
  return 0
}

function splitPreservedLines(text: string): string[] {
  return normalizeLineEndings(text).split('\n')
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

function collapseWhiteSpace(text: string): string {
  return normalizeLineEndings(text).replace(/\s+/g, ' ').trim()
}

function normalizeMaxLines(value: number | undefined): number {
  if (value === undefined) return DEFAULT_MAX_LINES
  if (!Number.isFinite(value)) return DEFAULT_MAX_LINES
  return Math.max(0, Math.floor(value))
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function positiveNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(0, Math.min(1, value))
}
