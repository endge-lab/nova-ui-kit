import type { NovaNode, NovaText } from '@endge/nova'

export type NovaUiFontWeight = NonNullable<NonNullable<NovaText['styles']>['font']>['weight']
export type NovaUiFontStyle = 'normal' | 'italic'

/** Наследуемые текстовые стили UI Kit. */
export interface NovaUiInheritedTextStyle {
  color?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: NovaUiFontWeight
  fontStyle?: NovaUiFontStyle
  lineHeight?: number
}

/** Bitmask ключей наследуемого style context. */
export const enum NovaUiStyleMask {
  None = 0,
  Color = 1 << 0,
  FontFamily = 1 << 1,
  FontSize = 1 << 2,
  FontWeight = 1 << 3,
  FontStyle = 1 << 4,
  LineHeight = 1 << 5,
  AllText = Color | FontFamily | FontSize | FontWeight | FontStyle | LineHeight,
}

/** Контекст стилей, который контейнер передает потомкам. */
export interface NovaUiStyleContext {
  values: NovaUiInheritedTextStyle
  mask: NovaUiStyleMask
  version: number
}

/** Результат реакции компонента на новый style context. */
export interface NovaUiStyleReceiveResult {
  update: boolean
  render: boolean
  layout: boolean
}

/** Символ помечает компонент, который принимает inherited style context. */
export const NOVA_UI_STYLE_TARGET = Symbol.for('@endge/nova-ui-kit.style-target')

/** Контракт компонента, который участвует в наследовании стилей. */
export interface NovaUiStyleTarget {
  readonly [NOVA_UI_STYLE_TARGET]: true
  receiveStyleContext: (
    context: NovaUiStyleContext,
    changedMask: NovaUiStyleMask,
  ) => NovaUiStyleReceiveResult
  getSubtreeStyleMask: () => NovaUiStyleMask
}

export const EMPTY_STYLE_CONTEXT: NovaUiStyleContext = {
  values: {},
  mask: NovaUiStyleMask.None,
  version: 0,
}

export const NO_STYLE_RECEIVE_RESULT: NovaUiStyleReceiveResult = {
  update: false,
  render: false,
  layout: false,
}

/** Проверяет, поддерживает ли Nova node style context. */
export function isNovaUiStyleTarget(node: unknown): node is NovaNode<any> & NovaUiStyleTarget {
  return !!node && (node as Partial<NovaUiStyleTarget>)[NOVA_UI_STYLE_TARGET] === true
}

/** Собирает bitmask явно заданных ключей style object. */
export function inheritedTextStyleMask(style?: NovaUiInheritedTextStyle): NovaUiStyleMask {
  let mask = NovaUiStyleMask.None

  if (!style) return mask
  if (style.color !== undefined) mask |= NovaUiStyleMask.Color
  if (style.fontFamily !== undefined) mask |= NovaUiStyleMask.FontFamily
  if (style.fontSize !== undefined) mask |= NovaUiStyleMask.FontSize
  if (style.fontWeight !== undefined) mask |= NovaUiStyleMask.FontWeight
  if (style.fontStyle !== undefined) mask |= NovaUiStyleMask.FontStyle
  if (style.lineHeight !== undefined) mask |= NovaUiStyleMask.LineHeight

  return mask
}

/** Собирает context из parent context и локального style patch. */
export function mergeStyleContext(
  parent: NovaUiStyleContext,
  style?: NovaUiInheritedTextStyle,
): NovaUiStyleContext {
  const mask = inheritedTextStyleMask(style)
  if (mask === NovaUiStyleMask.None) return parent

  return {
    values: {
      ...parent.values,
      ...style,
    },
    mask: parent.mask | mask,
    version: parent.version + 1,
  }
}

/** Возвращает mask реально изменившихся effective style keys. */
export function diffInheritedTextStyle(
  previous: NovaUiInheritedTextStyle,
  next: NovaUiInheritedTextStyle,
  mask: NovaUiStyleMask = NovaUiStyleMask.AllText,
): NovaUiStyleMask {
  let changed = NovaUiStyleMask.None

  if ((mask & NovaUiStyleMask.Color) !== 0 && previous.color !== next.color) {
    changed |= NovaUiStyleMask.Color
  }
  if ((mask & NovaUiStyleMask.FontFamily) !== 0 && previous.fontFamily !== next.fontFamily) {
    changed |= NovaUiStyleMask.FontFamily
  }
  if ((mask & NovaUiStyleMask.FontSize) !== 0 && previous.fontSize !== next.fontSize) {
    changed |= NovaUiStyleMask.FontSize
  }
  if ((mask & NovaUiStyleMask.FontWeight) !== 0 && previous.fontWeight !== next.fontWeight) {
    changed |= NovaUiStyleMask.FontWeight
  }
  if ((mask & NovaUiStyleMask.FontStyle) !== 0 && previous.fontStyle !== next.fontStyle) {
    changed |= NovaUiStyleMask.FontStyle
  }
  if ((mask & NovaUiStyleMask.LineHeight) !== 0 && previous.lineHeight !== next.lineHeight) {
    changed |= NovaUiStyleMask.LineHeight
  }

  return changed
}

/** Сравнивает style objects по inherited keys. */
export function styleContextChangedMask(
  previous: NovaUiStyleContext,
  next: NovaUiStyleContext,
): NovaUiStyleMask {
  return diffInheritedTextStyle(previous.values, next.values, previous.mask | next.mask)
}

/** Объединяет результаты style propagation без лишних объектов. */
export function mergeStyleReceiveResult(
  target: NovaUiStyleReceiveResult,
  source: NovaUiStyleReceiveResult,
): NovaUiStyleReceiveResult {
  target.update ||= source.update
  target.render ||= source.render
  target.layout ||= source.layout
  return target
}
