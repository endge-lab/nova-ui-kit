const DEFAULT_TEXT_MEASURE_CACHE_LIMIT = 2000

/** Небольшой bounded cache для измерения текста в layout hot path. */
export class TextMeasureCache {
  private readonly _values = new Map<string, number>()

  /**
   * Создает экземпляр TextMeasureCache и подготавливает базовое состояние.
   */
  constructor(private readonly _limit = DEFAULT_TEXT_MEASURE_CACHE_LIMIT) {}

  /** Возвращает cached width или вычисляет его через переданную функцию. */
  get(key: string, measure: () => number): number {
    const cached = this._values.get(key)
    if (cached !== undefined) {
      return cached
    }

    const value = measure()
    if (this._values.size >= this._limit) {
      const firstKey = this._values.keys().next().value
      if (firstKey !== undefined) {
        this._values.delete(firstKey)
      }
    }
    this._values.set(key, value)
    return value
  }

  /** Очищает cache при смене renderer или принудительном сбросе компонента. */
  clear(): void {
    this._values.clear()
  }
}
