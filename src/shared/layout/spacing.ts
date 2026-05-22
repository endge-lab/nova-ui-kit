/** Универсальное описание отступов для UI Kit layout. */
export type NovaUiSpacing =
  | number
  | { all?: number }
  | { horizontal?: number; vertical?: number }
  | { left?: number; right?: number; top?: number; bottom?: number }

/** Числовые отступы после normalization. */
export interface NovaUiResolvedSpacing {
  left: number
  right: number
  top: number
  bottom: number
}

/** Резолвит shorthand spacing в четыре числовые стороны. */
export function resolveSpacing(value?: NovaUiSpacing): NovaUiResolvedSpacing {
  if (typeof value === 'number') {
    const normalized = finiteSpacingNumber(value)
    return {
      left: normalized,
      right: normalized,
      top: normalized,
      bottom: normalized,
    }
  }

  if (!value) {
    return {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    }
  }

  if ('all' in value) {
    const normalized = finiteSpacingNumber(value.all)
    return {
      left: normalized,
      right: normalized,
      top: normalized,
      bottom: normalized,
    }
  }

  if ('horizontal' in value || 'vertical' in value) {
    const horizontal = finiteSpacingNumber(value.horizontal)
    const vertical = finiteSpacingNumber(value.vertical)
    return {
      left: horizontal,
      right: horizontal,
      top: vertical,
      bottom: vertical,
    }
  }

  const edgeSpacing = value as { left?: number; right?: number; top?: number; bottom?: number }
  return {
    left: finiteSpacingNumber(edgeSpacing.left),
    right: finiteSpacingNumber(edgeSpacing.right),
    top: finiteSpacingNumber(edgeSpacing.top),
    bottom: finiteSpacingNumber(edgeSpacing.bottom),
  }
}

function finiteSpacingNumber(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}
