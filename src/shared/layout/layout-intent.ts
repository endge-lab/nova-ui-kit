import type { NovaNode } from '@endge/nova'
import type { NovaUiLayoutValue } from '@/shared/layout/layout-value'
import type { NovaUiSpacing } from '@/shared/layout/spacing'

/** Layout-намерение node внутри flow-контейнера. */
export interface NovaUiLayoutIntent {
  width?: NovaUiLayoutValue
  height?: NovaUiLayoutValue
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  flexGrow?: number
  flexShrink?: number
  flexBasis?: NovaUiLayoutValue
  margin?: NovaUiSpacing
  alignSelf?: string
  order?: number
  gap?: number
  rowGap?: number
  columnGap?: number
}

const layoutIntentByNode = new WeakMap<object, NovaUiLayoutIntent>()

/** Сохраняет computed layout-намерение для node без расширения публичных props. */
export function setNovaUiNodeLayoutIntent(node: unknown, intent: NovaUiLayoutIntent | undefined): void {
  if (!node || typeof node !== 'object') return
  if (!intent || Object.keys(intent).length === 0) {
    layoutIntentByNode.delete(node)
    return
  }

  layoutIntentByNode.set(node, intent)
}

/** Возвращает computed layout-намерение node, если его задал style/class слой. */
export function getNovaUiNodeLayoutIntent(node: unknown): NovaUiLayoutIntent | undefined {
  return node && typeof node === 'object'
    ? layoutIntentByNode.get(node)
    : undefined
}

/** Объединяет несколько layout-намерений в порядке возрастания приоритета. */
export function mergeNovaUiLayoutIntents<TLayout extends NovaUiLayoutIntent>(
  ...items: Array<NovaUiLayoutIntent | undefined>
): TLayout {
  return items.reduce<NovaUiLayoutIntent>((result, item) => {
    if (!item) return result
    return {
      ...result,
      ...item,
    }
  }, {}) as TLayout
}

/** Возвращает текущие props node без привязки к конкретному компоненту. */
export function readNovaUiNodeProps(node: unknown): Record<string, unknown> {
  if (!node || typeof node !== 'object') return {}

  if ('getProps' in node && typeof (node as { getProps?: unknown }).getProps === 'function') {
    return ((node as NovaNode<any> & { getProps: () => Record<string, unknown> }).getProps?.() ?? {}) as Record<string, unknown>
  }

  return ((node as { props?: Record<string, unknown> }).props ?? {}) as Record<string, unknown>
}
