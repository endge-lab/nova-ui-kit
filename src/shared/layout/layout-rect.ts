/** Числовой rect, который layout-родитель назначает Nova node. */
export interface NovaUiLayoutRect {
  x: number
  y: number
  width: number
  height: number
}

/** Создает mutable rect для переиспользования в layout hot path. */
export function createLayoutRect(): NovaUiLayoutRect {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }
}

/** Проверяет, изменился ли rect без создания новых объектов. */
export function rectEquals(a: NovaUiLayoutRect, b: NovaUiLayoutRect): boolean {
  return (
    a.x === b.x
    && a.y === b.y
    && a.width === b.width
    && a.height === b.height
  )
}

/** Копирует rect в существующий объект, чтобы снизить нагрузку на GC. */
export function copyRect(target: NovaUiLayoutRect, source: NovaUiLayoutRect): void {
  target.x = source.x
  target.y = source.y
  target.width = source.width
  target.height = source.height
}

/** Ограничивает число диапазоном min/max. */
export function clampLayoutNumber(value: number, min = 0, max = Number.POSITIVE_INFINITY): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}
