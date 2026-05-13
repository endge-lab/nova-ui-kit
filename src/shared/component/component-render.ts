import type { NovaSchema } from '@endge/nova'
import type {
  NovaUiIconSource,
  NovaUiTextStyleDefaults,
} from '@/shared/component/component-props'

export function pushText(
  schema: NovaSchema,
  text: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  style: NovaUiTextStyleDefaults,
  options: { align?: 'left' | 'center' | 'right'; ellipsis?: boolean } = {},
): void {
  if (!text || width <= 0 || height <= 0) return

  schema.push({
    type: 'text',
    text,
    x,
    y,
    width,
    height,
    styles: {
      color: style.color,
      font: {
        family: style.fontFamily,
        size: style.fontSize,
        weight: style.fontWeight,
        style: style.fontStyle,
      },
      lineHeight: style.lineHeight,
      align: {
        horizontal: options.align ?? 'left',
        vertical: 'middle',
      },
      ellipsis: options.ellipsis ?? true,
    },
  })
}

export function pushIcon(
  schema: NovaSchema,
  icon: NovaUiIconSource | undefined,
  x: number,
  y: number,
  size: number,
  opacity = 1,
): void {
  if (!icon || size <= 0) return

  schema.push({
    type: 'icon',
    icon,
    x,
    y,
    width: size,
    height: size,
    styles: { opacity },
  })
}

export function sizeTokenHeight(size: 'sm' | 'md' | 'lg' | undefined, fallback = 32): number {
  if (size === 'sm') return 24
  if (size === 'lg') return 40
  return fallback
}

export function sizeTokenPadding(size: 'sm' | 'md' | 'lg' | undefined): { horizontal: number; vertical: number; gap: number; icon: number } {
  if (size === 'sm') return { horizontal: 10, vertical: 4, gap: 6, icon: 14 }
  if (size === 'lg') return { horizontal: 16, vertical: 9, gap: 10, icon: 20 }
  return { horizontal: 12, vertical: 6, gap: 8, icon: 16 }
}
