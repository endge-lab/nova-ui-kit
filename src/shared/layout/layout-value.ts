/** Значение размера из schema до вычисления пикселей. */
export type NovaUiLayoutValue =
  | number
  | `${number}%`
  | 'auto'
  | 'fill'

/** Быстрый тип значения для layout hot path. */
export const enum NovaUiLayoutValueKind {
  Px = 0,
  Percent = 1,
  Auto = 2,
  Fill = 3,
}

/** Скомпилированное значение размера без строкового парсинга в update. */
export interface NovaUiCompiledLayoutValue {
  kind: NovaUiLayoutValueKind
  value: number
}

/** Компилирует размер один раз при изменении schema или props. */
export function compileLayoutValue(
  value: NovaUiLayoutValue | undefined,
  fallback: NovaUiLayoutValue,
): NovaUiCompiledLayoutValue {
  const source = value ?? fallback

  if (typeof source === 'number') {
    return {
      kind: NovaUiLayoutValueKind.Px,
      value: Math.max(0, finiteLayoutNumber(source, 0)),
    }
  }

  if (source === 'auto') {
    return {
      kind: NovaUiLayoutValueKind.Auto,
      value: 0,
    }
  }

  if (source === 'fill') {
    return {
      kind: NovaUiLayoutValueKind.Fill,
      value: 1,
    }
  }

  return {
    kind: NovaUiLayoutValueKind.Percent,
    value: Math.max(0, finiteLayoutNumber(Number.parseFloat(source), 0) / 100),
  }
}

/** Резолвит скомпилированный размер в пиксели. */
export function resolveLayoutValue(
  value: NovaUiCompiledLayoutValue,
  available: number,
  fallback: number,
): number {
  switch (value.kind) {
    case NovaUiLayoutValueKind.Px:
      return value.value
    case NovaUiLayoutValueKind.Percent:
      return Math.max(0, available * value.value)
    case NovaUiLayoutValueKind.Fill:
      return Math.max(0, available)
    case NovaUiLayoutValueKind.Auto:
      return Math.max(0, fallback)
  }
}

/** Проверяет, требует ли значение measureLayout у ребенка. */
export function isAutoLayoutValue(value: NovaUiCompiledLayoutValue): boolean {
  return value.kind === NovaUiLayoutValueKind.Auto
}

function finiteLayoutNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}
