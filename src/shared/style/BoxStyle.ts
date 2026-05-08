/** Радиус скругления по отдельным углам. */
export interface NovaUiBorderRadius {
  topLeft?: number
  topRight?: number
  bottomRight?: number
  bottomLeft?: number
}

/** Числовой радиус скругления после normalization. */
export interface NovaUiResolvedBorderRadius {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

/** Универсальный border для UI Kit компонентов. */
export interface NovaUiBorder {
  color?: string
  width?: number
  radius?: number | NovaUiBorderRadius
}

/** Числовой border после normalization. */
export interface NovaUiResolvedBorder {
  color?: string
  width: number
  radius: number | NovaUiResolvedBorderRadius
}

/** Общие box-стили, которые не наследуются потомками. */
export interface NovaUiBoxStyleProps {
  background?: string
  border?: NovaUiBorder
  clip?: boolean
}

/** Нормализует border для render hot path. */
export function normalizeBorder(border?: NovaUiBorder): NovaUiResolvedBorder | undefined {
  if (!border) return undefined

  return {
    color: border.color,
    width: finiteStyleNumber(border.width),
    radius: normalizeBorderRadius(border.radius),
  }
}

/** Нормализует radius в число или объект с четырьмя углами. */
export function normalizeBorderRadius(radius: NovaUiBorder['radius']): number | NovaUiResolvedBorderRadius {
  if (typeof radius === 'number') return finiteStyleNumber(radius)
  if (!radius) return 0

  return {
    topLeft: finiteStyleNumber(radius.topLeft),
    topRight: finiteStyleNumber(radius.topRight),
    bottomRight: finiteStyleNumber(radius.bottomRight),
    bottomLeft: finiteStyleNumber(radius.bottomLeft),
  }
}

/** Преобразует radius к текущему renderer-формату Nova. */
export function borderRadiusToRendererValue(radius: NovaUiBorder['radius']): number {
  const normalized = normalizeBorderRadius(radius)
  if (typeof normalized === 'number') return normalized

  return Math.max(
    normalized.topLeft,
    normalized.topRight,
    normalized.bottomRight,
    normalized.bottomLeft,
  )
}

function finiteStyleNumber(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}
