/** Направление главной оси flex layout. */
export type NovaUiFlexAxis = 'row' | 'column'

/** Метрики одной flex-линии без ссылки на Nova runtime. */
export interface NovaUiFlexLineMetrics {
  main: number
  cross: number
  totalGrow: number
  totalShrink: number
}

/** Создает mutable метрики линии для переиспользования в engine. */
export function createFlexLineMetrics(): NovaUiFlexLineMetrics {
  return {
    main: 0,
    cross: 0,
    totalGrow: 0,
    totalShrink: 0,
  }
}
