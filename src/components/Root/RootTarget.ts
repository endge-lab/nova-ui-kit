import type { NovaNode } from '@endge/nova'

/** Символ помечает обязательный корень дерева Nova UI Kit. */
export const NOVA_UI_ROOT_TARGET = Symbol.for('@endge/nova-ui-kit.root-target')

/** Контракт Root, который нужен потомкам для проверки корректного дерева. */
export interface NovaUiRootTarget {
  readonly [NOVA_UI_ROOT_TARGET]: true
}

/** Проверяет, является ли node корнем Nova UI Kit дерева. */
export function isNovaUiRootTarget(node: unknown): node is NovaNode<any> & NovaUiRootTarget {
  return !!node && (node as Partial<NovaUiRootTarget>)[NOVA_UI_ROOT_TARGET] === true
}

/** Ищет Root в ancestor chain без участия Nova Core. */
export function findNovaUiRoot(node: NovaNode<any>): (NovaNode<any> & NovaUiRootTarget) | null {
  let parent = node.parent

  while (parent) {
    if (isNovaUiRootTarget(parent)) return parent
    parent = parent.parent
  }

  return null
}

/** Проверяет, что UI Kit компонент смонтирован внутри Root. */
export function requireNovaUiRoot(node: NovaNode<any>): NovaNode<any> & NovaUiRootTarget {
  const root = findNovaUiRoot(node)
  if (!root) {
    throw new Error('[Nova UI Kit] Flex, Grid и TextBlock должны быть смонтированы внутри NovaUiKit.Root')
  }

  return root
}
