import type { NovaComponentNode } from '@endge/nova'

export type NovaUiStyleAttrValue = string | number | boolean

/** Метаданные компонента, по которым selector engine сопоставляет правила. */
export interface NovaUiStyleIdentityProps {
  className?: string | Array<string>
  attrs?: Record<string, NovaUiStyleAttrValue>
}

/** Нормализованное имя класса для быстрых selector checks. */
export function normalizeStyleClasses(className?: string | Array<string>): Array<string> {
  if (!className) return []
  if (Array.isArray(className)) return className.filter(Boolean)

  return className
    .split(/\s+/)
    .map(item => item.trim())
    .filter(Boolean)
}

/** Читает props компонента без привязки к конкретной реализации UI Kit. */
export function readNovaUiStyleIdentityProps(node: NovaComponentNode<any, any, any, any>): NovaUiStyleIdentityProps {
  const props = node.getProps() as NovaUiStyleIdentityProps

  return {
    className: props.className,
    attrs: props.attrs,
  }
}
