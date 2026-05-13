import type { NovaSchema, NovaText } from '@endge/nova'
import { layoutTextBlock } from '@/components/TextBlock/text-block-layout'
import type {
  TextBlockMeasureFn,
  TextBlockResolvedProps,
} from '@/components/TextBlock/text-block.types'
import { borderRadiusToRendererValue } from '@/shared/style'

export function buildTextBlockSchema(
  props: TextBlockResolvedProps,
  measureText: TextBlockMeasureFn,
  mode: 'node' | 'schema',
): NovaSchema {
  const layout = layoutTextBlock(props, measureText)
  const schema: NovaSchema = []
  const offsetX = mode === 'schema' ? props.x : 0
  const offsetY = mode === 'schema' ? props.y : 0

  if (props.background) {
    schema.push({
      type: 'rect',
      x: offsetX,
      y: offsetY,
      width: props.width,
      height: props.height,
      styles: {
        background: props.background,
      },
    })
  }

  if (props.border?.width) {
    schema.push({
      type: 'border',
      x: offsetX,
      y: offsetY,
      width: props.width,
      height: props.height,
      styles: {
        color: props.border.color ?? '#d6d9e2',
        width: props.border.width,
        radius: borderRadiusToRendererValue(props.border.radius),
      },
    })
  }

  for (const line of layout.lines) {
    schema.push({
      type: 'text',
      text: line.text,
      x: offsetX + line.x,
      y: offsetY + line.y,
      width: line.widthLimit,
      height: line.height,
      clip: props.overflow !== 'visible' ? true : undefined,
      styles: {
        color: props.color,
        opacity: props.opacity,
        font: {
          family: props.fontFamily,
          size: props.fontSize,
          weight: props.fontWeight,
          style: props.fontStyle,
        },
        lineHeight: props.lineHeight,
        align: {
          horizontal: props.align,
          vertical: 'top',
        },
      },
    })
  }

  return schema
}

export function toTextBlockMeasureSchema(text: string, options: Parameters<TextBlockMeasureFn>[1]): NovaText {
  return {
    text,
    x: 0,
    y: 0,
    width: 100000,
    height: options.fontSize * 2,
    styles: {
      font: {
        family: options.fontFamily,
        size: options.fontSize,
        weight: options.fontWeight,
        style: options.fontStyle,
      },
    },
  }
}
