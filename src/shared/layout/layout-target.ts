import type { NovaNode } from '@endge/nova'
import type { NovaUiLayoutRect } from '@/shared/layout/layout-rect'

/** Символ помечает компонент, который принимает rect от layout-родителя. */
export const NOVA_UI_LAYOUT_TARGET = Symbol.for('@endge/nova-ui-kit.layout-target')

/** Ограничения для измерения auto-размера компонента. */
export interface NovaUiLayoutConstraints {
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
}

/** Результат измерения preferred size для auto layout. */
export interface NovaUiLayoutMeasure {
  width: number
  height: number
}

/** Контракт компонента, который умеет принимать rect от layout-родителя. */
export interface NovaUiLayoutTarget {
  readonly [NOVA_UI_LAYOUT_TARGET]: true
  applyLayoutRect(rect: NovaUiLayoutRect): boolean
  measureLayout?: (constraints: NovaUiLayoutConstraints) => NovaUiLayoutMeasure
}

/** Проверяет, поддерживает ли Nova node быстрый layout target контракт. */
export function isNovaUiLayoutTarget(node: unknown): node is NovaNode<any> & NovaUiLayoutTarget {
  return !!node && (node as Partial<NovaUiLayoutTarget>)[NOVA_UI_LAYOUT_TARGET] === true
}

/** UI Kit-level display:none исключает node из layout без удаления instance. */
export function isNovaUiLayoutDisplayed(node: unknown): boolean {
  if (!node || typeof node !== 'object' || !('getProps' in node)) return true

  const props = (node as { getProps: () => Record<string, unknown> }).getProps()
  return props.display !== 'none'
}

/** Помечает layout-предков грязными, когда display меняет участие node в layout. */
export function relayoutNovaUiLayoutAncestors(node: { parent?: unknown }): void {
  let parent = node.parent
  while (parent && typeof parent === 'object') {
    const candidate = parent as { parent?: unknown; getApi?: () => { relayout?: () => void } }
    candidate.getApi?.().relayout?.()
    parent = candidate.parent
  }
}

/** Применяет rect к UI Kit target или к обычному NovaNode через options. */
export function applyNodeLayoutRect(node: NovaNode<any>, rect: NovaUiLayoutRect): boolean {
  if (isNovaUiLayoutTarget(node)) return node.applyLayoutRect(rect)

  if (
    node.x === rect.x
    && node.y === rect.y
    && node.width === rect.width
    && node.height === rect.height
  ) {
    return false
  }

  node.options({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  })
  return true
}
