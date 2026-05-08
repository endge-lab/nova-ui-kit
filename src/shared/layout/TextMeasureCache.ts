const DEFAULT_TEXT_MEASURE_CACHE_LIMIT = 2000

/** Небольшой bounded cache для измерения текста в layout hot path. */
export class TextMeasureCache {
  private readonly values = new Map<string, number>()

  constructor(private readonly limit = DEFAULT_TEXT_MEASURE_CACHE_LIMIT) {}

  /** Возвращает cached width или вычисляет его через переданную функцию. */
  get(key: string, measure: () => number): number {
    const cached = this.values.get(key)
    if (cached !== undefined) return cached

    const value = measure()
    if (this.values.size >= this.limit) {
      const firstKey = this.values.keys().next().value
      if (firstKey !== undefined) this.values.delete(firstKey)
    }
    this.values.set(key, value)
    return value
  }

  /** Очищает cache при смене renderer или принудительном сбросе компонента. */
  clear(): void {
    this.values.clear()
  }
}
