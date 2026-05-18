import type { NovaSchema } from '@endge/nova'
import {
  type NovaScrollbarAxis,
  type NovaScrollbarGeometry,
  type NovaScrollbarGeometryInput,
  type NovaScrollbarRect,
  type NovaScrollbarResolvedVisualOptions,
  type NovaScrollbarVisualOptions,
  type NovaScrollbarVisualState,
} from '@/components/Scrollbar/scrollbar.types'
import { clamp, finiteNumber } from '@/shared/component'

/**
 * Нормализует визуальные настройки scrollbar для переиспользования в canvas-компонентах.
 */
export function normalizeNovaScrollbarVisualOptions(
  options: NovaScrollbarVisualOptions | undefined,
  defaults: Partial<NovaScrollbarResolvedVisualOptions> = {},
): NovaScrollbarResolvedVisualOptions {
  const thumbColor = options?.thumbColor ?? defaults.thumbColor ?? 'rgba(71,85,105,0.72)'
  return {
    visibility: options?.visibility ?? defaults.visibility ?? 'always',
    thickness: Math.max(3, finiteNumber(options?.thickness, defaults.thickness ?? 8)),
    minThumbSize: Math.max(12, finiteNumber(options?.minThumbSize, defaults.minThumbSize ?? 28)),
    radius: Math.max(0, finiteNumber(options?.radius, defaults.radius ?? 999)),
    trackColor: options?.trackColor ?? defaults.trackColor ?? 'rgba(148,163,184,0.24)',
    thumbColor,
    thumbHoverColor: options?.thumbHoverColor ?? defaults.thumbHoverColor ?? thumbColor,
    borderColor: options?.borderColor ?? defaults.borderColor,
    borderWidth: Math.max(0, finiteNumber(options?.borderWidth, defaults.borderWidth ?? 0)),
    className: options?.className ?? defaults.className,
  }
}

/**
 * Вычисляет track/thumb geometry для контролируемого scrollbar без владения scroll-состоянием.
 */
export function createNovaScrollbarGeometry(input: NovaScrollbarGeometryInput): NovaScrollbarGeometry {
  const options = normalizeNovaScrollbarVisualOptions(input.options)
  const axis = input.axis
  const track = normalizeRect(input.track)
  const viewportSize = Math.max(0, finiteNumber(input.viewportSize, axis === 'horizontal' ? track.width : track.height))
  const contentSize = Math.max(viewportSize, finiteNumber(input.contentSize, viewportSize))
  const max = Math.max(0, contentSize - viewportSize)
  const value = clamp(finiteNumber(input.value, 0), 0, max)
  const trackLength = Math.max(1, axis === 'horizontal' ? track.width : track.height)
  const crossSize = Math.max(1, axis === 'horizontal' ? track.height : track.width)
  const thumbLength = Math.min(trackLength, Math.max(
    options.minThumbSize,
    trackLength * (viewportSize / Math.max(1, contentSize)),
  ))
  const travel = Math.max(0, trackLength - thumbLength)
  const offset = max > 0 ? travel * (value / max) : 0
  const thickness = Math.min(crossSize, options.thickness)

  const thumb = axis === 'horizontal'
    ? {
        x: track.x + offset,
        y: track.y + (crossSize - thickness) / 2,
        width: thumbLength,
        height: thickness,
      }
    : {
        x: track.x + (crossSize - thickness) / 2,
        y: track.y + offset,
        width: thickness,
        height: thumbLength,
      }

  return {
    axis,
    track,
    thumb,
    value,
    max,
    viewportSize,
    contentSize,
    visibleStart: value,
    visibleEnd: value + viewportSize,
    options,
  }
}

/**
 * Рисует стандартный track/thumb для готовой geometry.
 */
export function createNovaScrollbarSchema(
  geometry: NovaScrollbarGeometry,
  state: NovaScrollbarVisualState = { alpha: 1, hoveredAxis: null, draggingAxis: null },
): NovaSchema {
  const alpha = clamp(finiteNumber(state.alpha, 1), 0, 1)
  if (alpha <= 0) return []
  const active = state.hoveredAxis === geometry.axis || state.draggingAxis === geometry.axis
  return [
    {
      type: 'rect',
      ...geometry.track,
      styles: {
        background: geometry.options.trackColor,
        opacity: alpha,
        border: {
          radius: geometry.options.radius,
          color: geometry.options.borderColor,
          width: geometry.options.borderWidth,
        },
      },
    },
    {
      type: 'rect',
      ...geometry.thumb,
      styles: {
        background: active ? geometry.options.thumbHoverColor : geometry.options.thumbColor,
        opacity: alpha,
        border: {
          radius: geometry.options.radius,
          color: geometry.options.borderColor,
          width: geometry.options.borderWidth,
        },
      },
    },
  ]
}

/**
 * Переводит drag delta по track в новое scroll-значение.
 */
export function mapNovaScrollbarDragValue(
  geometry: NovaScrollbarGeometry,
  startValue: number,
  delta: number,
): number {
  const travel = Math.max(1, geometry.axis === 'horizontal'
    ? geometry.track.width - geometry.thumb.width
    : geometry.track.height - geometry.thumb.height)
  return clamp(startValue + delta / travel * geometry.max, 0, geometry.max)
}

/**
 * Возвращает true, если точка лежит внутри rect.
 */
export function hitNovaScrollbarRect(x: number, y: number, rect: NovaScrollbarRect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}

/**
 * Создает geometry с уже заданным thumb, когда host управляет нестандартным размером handle.
 */
export function createNovaScrollbarGeometryFromThumb(
  axis: NovaScrollbarAxis,
  track: NovaScrollbarRect,
  thumb: NovaScrollbarRect,
  metrics: Pick<NovaScrollbarGeometry, 'value' | 'max' | 'viewportSize' | 'contentSize'>,
  options?: NovaScrollbarVisualOptions,
): NovaScrollbarGeometry {
  return {
    axis,
    track: normalizeRect(track),
    thumb: normalizeRect(thumb),
    value: metrics.value,
    max: metrics.max,
    viewportSize: metrics.viewportSize,
    contentSize: metrics.contentSize,
    visibleStart: metrics.value,
    visibleEnd: metrics.value + metrics.viewportSize,
    options: normalizeNovaScrollbarVisualOptions(options),
  }
}

function normalizeRect(rect: NovaScrollbarRect): NovaScrollbarRect {
  return {
    x: finiteNumber(rect.x, 0),
    y: finiteNumber(rect.y, 0),
    width: Math.max(0, finiteNumber(rect.width, 0)),
    height: Math.max(0, finiteNumber(rect.height, 0)),
  }
}
