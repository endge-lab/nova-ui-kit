import type { NovaApp, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { TextBlockDescriptor } from '@/components/TextBlock/text-block.config'
import type { TextBlockApi, TextBlockLayout, TextBlockMeasureFn, TextBlockProps, TextBlockResolvedProps } from '@/components/TextBlock/text-block.types'
import type { NovaUiLayoutConstraints, NovaUiLayoutMeasure, NovaUiLayoutRect, NovaUiLayoutTarget } from '@/shared/layout'
import type { NovaUiInheritedTextStyle, NovaUiStyleContext, NovaUiStyleReceiveResult, NovaUiStyleTarget } from '@/shared/style'
import {

  NovaComponentNode,

} from '@endge/nova'
import { layoutTextBlock, normalizeTextBlockProps } from '@/components/TextBlock/text-block-layout'
import {
  TEXT_BLOCK_NODE_DESCRIPTOR,

} from '@/components/TextBlock/text-block.config'
import { buildTextBlockSchema } from '@/components/TextBlock/text-block.schema'
import {
  clampLayoutNumber,
  copyRect,
  createLayoutRect,
  measureNovaUiTextWidth,
  NOVA_UI_LAYOUT_TARGET,

  rectEquals,
  relayoutNovaUiLayoutAncestors,
  TextMeasureCache,
} from '@/shared/layout'
import { isNovaUiMotionEnabled, resolveNovaUiMotionOptions } from '@/shared/motion'
import {
  diffInheritedTextStyle,
  EMPTY_STYLE_CONTEXT,
  inheritedTextStyleMask,
  NOVA_UI_STYLE_TARGET,

  NovaUiStyleMask,

} from '@/shared/style'
import {
  ensureNovaUIKitThemes,
  resolveNovaUiThemeValue,
} from '@/shared/style/nova-ui-kit-theme'

const TEXT_BLOCK_LAYOUT_STYLE_MASK = (
  NovaUiStyleMask.FontFamily
  | NovaUiStyleMask.FontSize
  | NovaUiStyleMask.FontWeight
  | NovaUiStyleMask.FontStyle
  | NovaUiStyleMask.LineHeight
)

const TEXT_BLOCK_RENDER_STYLE_MASK = NovaUiStyleMask.Color
const TEXT_BLOCK_CONSUMED_STYLE_MASK = TEXT_BLOCK_LAYOUT_STYLE_MASK | TEXT_BLOCK_RENDER_STYLE_MASK

/** Текстовый блок, который может работать standalone и внутри layout-родителя. */
export class TextBlock<E extends EventList = Record<string, any>>
  extends NovaComponentNode<TextBlockResolvedProps, TextBlockApi, Record<string, never>, TextBlockProps, E>
  implements NovaUiLayoutTarget, NovaUiStyleTarget {
  readonly [NOVA_UI_LAYOUT_TARGET] = true as const
  readonly [NOVA_UI_STYLE_TARGET] = true as const

  private readonly _layoutRect = createLayoutRect()
  private readonly _textMeasureCache = new TextMeasureCache()
  private _layout: TextBlockLayout | null = null
  private readonly _api: TextBlockApi
  private _externalLayout = false
  private _inheritedStyleContext = EMPTY_STYLE_CONTEXT
  private _explicitTopLevelStyleMask = NovaUiStyleMask.None
  private _localStyleMask = NovaUiStyleMask.None
  private _effectiveTextStyle: NovaUiInheritedTextStyle = {}

  /**
   * Создает экземпляр TextBlock и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: TextBlockProps = {},
    options: { componentId?: string } = {},
    descriptor: TextBlockDescriptor = TEXT_BLOCK_NODE_DESCRIPTOR,
  ) {
    ensureNovaUIKitThemes(app)
    const resolvedProps = normalizeTextBlockProps(props)
    const initialProps = isNovaUiMotionEnabled(props) && props.motion === 'fadeIn'
      ? { ...resolvedProps, opacity: 0 }
      : resolvedProps
    super(app, surface, descriptor, initialProps, options)
    this.addDisposer(app.theme.observe(this, { phase: 'render' }))
    this.__type = 'TextBlock'
    this._applyDisplayState()
    this._explicitTopLevelStyleMask = textBlockTopLevelStyleMask(props)
    this._localStyleMask = inheritedTextStyleMask(resolvedProps.style)
    this._effectiveTextStyle = resolveTextBlockEffectiveStyle(
      resolvedProps,
      this._inheritedStyleContext,
      this._explicitTopLevelStyleMask,
    )
    this._applyInitialLayoutRect(resolvedProps)
    this._layout = this._computeLayout()
    this._api = {
      setText: text => this.setProps({ text }),
      setProps: patch => this.setProps(patch),
      getProps: () => this._resolveCurrentLayoutProps(),
      measure: () => this._ensureLayout(),
      getLines: () => this._ensureLayout().lines,
      isOverflowed: () => this._ensureLayout().overflowed,
    }
    if (isNovaUiMotionEnabled(props) && props.motion === 'fadeIn') {
      this.fadeIn({ to: resolvedProps.opacity })
    }
  }

  /**
   * Обновляет значение состояния TextBlock.
   */
  override setProps(patch: TextBlockProps): this {
    this._explicitTopLevelStyleMask |= textBlockTopLevelStyleMask(patch)
    return super.setProps(patch as Partial<TextBlockResolvedProps>)
  }

  /**
   * Возвращает значение состояния TextBlock.
   */
  override getApi(): TextBlockApi {
    return this._api
  }

  /**
   * Выполняет действие fadeIn в рамках ответственности TextBlock.
   */
  fadeIn(options: { to?: number } = {}): void {
    this.transitionTo(
      { opacity: options.to ?? 1 },
      resolveNovaUiMotionOptions('fadeIn'),
    )
  }

  /**
   * Выполняет действие textColorPulse в рамках ответственности TextBlock.
   */
  textColorPulse(accent = '#4f7cff'): void {
    const current = this.props.color
    this.transitionTo(
      { color: accent },
      { ...resolveNovaUiMotionOptions('textColorPulse'), duration: 180 },
    )
    this.nova.motion.to(this, { color: current }, {
      ...resolveNovaUiMotionOptions('textColorPulse'),
      delay: 180,
      overwrite: false,
    })
  }

  /** Принимает итоговый rect от Flex и сбрасывает layout cache только при изменении. */
  applyLayoutRect(rect: NovaUiLayoutRect): boolean {
    this._externalLayout = true
    return this._applyResolvedRect(rect)
  }

  /** Принимает inherited style context и выбирает update/render по bitmask. */
  receiveStyleContext(context: NovaUiStyleContext, changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    this._inheritedStyleContext = context
    const previousStyle = this._effectiveTextStyle
    const nextStyle = resolveTextBlockEffectiveStyle(this.props, context, this._explicitTopLevelStyleMask)
    const affectedMask = changedMask & this.getSubtreeStyleMask()
    const effectiveChangedMask = diffInheritedTextStyle(previousStyle, nextStyle, affectedMask)

    if (effectiveChangedMask === NovaUiStyleMask.None) {
      return {
        update: false,
        render: false,
        layout: false,
      }
    }

    this._effectiveTextStyle = nextStyle

    if ((effectiveChangedMask & TEXT_BLOCK_LAYOUT_STYLE_MASK) !== 0) {
      this._layout = null
      this.dirty({ update: true, render: true })
      return {
        update: true,
        render: true,
        layout: true,
      }
    }

    if ((effectiveChangedMask & TEXT_BLOCK_RENDER_STYLE_MASK) !== 0) {
      this.dirty({ render: true })
      return {
        update: false,
        render: true,
        layout: false,
      }
    }

    return {
      update: false,
      render: false,
      layout: false,
    }
  }

  /**
   * Возвращает значение состояния TextBlock.
   */
  getSubtreeStyleMask(): NovaUiStyleMask {
    return TEXT_BLOCK_CONSUMED_STYLE_MASK & ~(this._explicitTopLevelStyleMask | this._localStyleMask)
  }

  /** Измеряет preferred size для auto layout с учетом constraints. */
  measureLayout(constraints: NovaUiLayoutConstraints): NovaUiLayoutMeasure {
    const fallbackWidth = this._layoutRect.width || this.props.width
    const width = clampLayoutNumber(
      fallbackWidth,
      constraints.minWidth,
      constraints.maxWidth,
    )
    const heightLimit = Number.isFinite(constraints.maxHeight)
      ? constraints.maxHeight
      : Math.max(this._layoutRect.height, this.props.height)
    const props = this._resolveLayoutProps(width, heightLimit)
    const layout = layoutTextBlock(props, this._measureText)
    const measuredHeight = layout.contentHeight + props.padding.top + props.padding.bottom

    return {
      width,
      height: clampLayoutNumber(
        measuredHeight,
        constraints.minHeight,
        constraints.maxHeight,
      ),
    }
  }

  /**
   * Обновляет runtime-состояние TextBlock.
   */
  update(): void {
    this._layout = this._computeLayout()
  }

  /**
   * Выполняет отрисовку TextBlock.
   */
  render(): void {
    this.renderSchema(buildTextBlockSchema(this._resolveThemeLayoutProps(this._resolveCurrentLayoutProps()), this._measureText, 'node'))
  }

  /**
   * Обрабатывает входящее событие TextBlock.
   */
  protected override onPropsChanged(changedKeys: Array<keyof TextBlockResolvedProps>): void {
    const previousStyle = this._effectiveTextStyle
    this.props = normalizeTextBlockProps(this.props)
    this._localStyleMask = inheritedTextStyleMask(this.props.style)
    this._effectiveTextStyle = resolveTextBlockEffectiveStyle(
      this.props,
      this._inheritedStyleContext,
      this._explicitTopLevelStyleMask,
    )
    const styleChangedMask = diffInheritedTextStyle(previousStyle, this._effectiveTextStyle)
    this._applyDisplayState()
    if (changedKeys.includes('display')) {
      this._markLayoutAncestorsDirty()
    }
    if (hasTextBlockLayoutChanges(changedKeys) || (styleChangedMask & TEXT_BLOCK_LAYOUT_STYLE_MASK) !== 0) {
      this._layout = null
    }
    if ((styleChangedMask & TEXT_BLOCK_LAYOUT_STYLE_MASK) !== 0) {
      this.dirty({ update: true, render: true })
    }
    if (!this._externalLayout && hasGeometryChanges(changedKeys)) {
      this._applyResolvedRect({
        x: this.props.x,
        y: this.props.y,
        width: this.props.width,
        height: this.props.height,
      })
    }
  }

  /**
   * Применяет подготовленное состояние TextBlock.
   */
  private _applyInitialLayoutRect(props: TextBlockResolvedProps): void {
    copyRect(this._layoutRect, {
      x: props.x,
      y: props.y,
      width: props.width,
      height: props.height,
    })
    super.options({
      x: this._layoutRect.x,
      y: this._layoutRect.y,
      width: this._layoutRect.width,
      height: this._layoutRect.height,
    })
  }

  /**
   * Применяет подготовленное состояние TextBlock.
   */
  private _applyResolvedRect(rect: NovaUiLayoutRect): boolean {
    if (rectEquals(this._layoutRect, rect)) {
      return false
    }

    const sizeChanged = this._layoutRect.width !== rect.width || this._layoutRect.height !== rect.height
    copyRect(this._layoutRect, rect)
    super.options({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    })
    if (sizeChanged) {
      this._layout = null
    }
    this.dirty({ matrix: true, update: sizeChanged, render: true })
    return true
  }

  /**
   * Выполняет внутренний шаг ensureLayout для TextBlock.
   */
  private _ensureLayout(): TextBlockLayout {
    if (!this._layout) {
      this._layout = this._computeLayout()
    }
    return this._layout
  }

  /**
   * Вычисляет производное значение TextBlock.
   */
  private _computeLayout(): TextBlockLayout {
    return layoutTextBlock(this._resolveCurrentLayoutProps(), this._measureText)
  }

  /**
   * Нормализует и возвращает итоговое значение TextBlock.
   */
  private _resolveCurrentLayoutProps(): TextBlockResolvedProps {
    return this._resolveLayoutProps(this._layoutRect.width, this._layoutRect.height)
  }

  /**
   * Нормализует и возвращает итоговое значение TextBlock.
   */
  private _resolveLayoutProps(width: number, height: number): TextBlockResolvedProps {
    return {
      ...this.props,
      x: 0,
      y: 0,
      width: Math.max(0, width),
      height: Math.max(0, height),
      color: this._effectiveTextStyle.color ?? this.props.color,
      fontFamily: this._effectiveTextStyle.fontFamily ?? this.props.fontFamily,
      fontSize: this._effectiveTextStyle.fontSize ?? this.props.fontSize,
      fontWeight: this._effectiveTextStyle.fontWeight ?? this.props.fontWeight,
      fontStyle: this._effectiveTextStyle.fontStyle ?? this.props.fontStyle,
      lineHeight: this._effectiveTextStyle.lineHeight ?? this.props.lineHeight,
    }
  }

  private _resolveThemeLayoutProps(props: TextBlockResolvedProps): TextBlockResolvedProps {
    return {
      ...props,
      color: resolveNovaUiThemeValue(this.nova, props.color) ?? props.color,
      background: resolveNovaUiThemeValue(this.nova, props.background),
      border: props.border
        ? {
            ...props.border,
            color: resolveNovaUiThemeValue(this.nova, props.border.color),
          }
        : props.border,
    }
  }

  private readonly _measureText: TextBlockMeasureFn = (text, options) => (
    this._textMeasureCache.get(
      `${options.fontFamily}|${options.fontSize}|${options.fontWeight}|${options.fontStyle}|${text}`,
      () => measureNovaUiTextWidth(text, options),
    )
  )

  /**
   * Применяет подготовленное состояние TextBlock.
   */
  private _applyDisplayState(): void {
    const displayed = this.props.display !== 'none'
    this.visible = displayed
    this.active = displayed
  }

  /**
   * Выполняет внутренний шаг markLayoutAncestorsDirty для TextBlock.
   */
  private _markLayoutAncestorsDirty(): void {
    relayoutNovaUiLayoutAncestors(this)
  }
}

function hasGeometryChanges(keys: Array<keyof TextBlockResolvedProps>): boolean {
  return keys.includes('x') || keys.includes('y') || keys.includes('width') || keys.includes('height')
}

function hasTextBlockLayoutChanges(keys: Array<keyof TextBlockResolvedProps>): boolean {
  return (
    keys.includes('text')
    || keys.includes('width')
    || keys.includes('height')
    || keys.includes('fontFamily')
    || keys.includes('fontSize')
    || keys.includes('fontWeight')
    || keys.includes('fontStyle')
    || keys.includes('lineHeight')
    || keys.includes('padding')
    || keys.includes('whiteSpace')
    || keys.includes('overflow')
    || keys.includes('maxLines')
    || keys.includes('wordBreak')
    || keys.includes('align')
    || keys.includes('verticalAlign')
  )
}

function textBlockTopLevelStyleMask(props: TextBlockProps | Partial<TextBlockResolvedProps>): NovaUiStyleMask {
  let mask = NovaUiStyleMask.None

  if (props.color !== undefined) {
    mask |= NovaUiStyleMask.Color
  }
  if (props.fontFamily !== undefined) {
    mask |= NovaUiStyleMask.FontFamily
  }
  if (props.fontSize !== undefined) {
    mask |= NovaUiStyleMask.FontSize
  }
  if (props.fontWeight !== undefined) {
    mask |= NovaUiStyleMask.FontWeight
  }
  if (props.fontStyle !== undefined) {
    mask |= NovaUiStyleMask.FontStyle
  }
  if (props.lineHeight !== undefined) {
    mask |= NovaUiStyleMask.LineHeight
  }

  return mask
}

function resolveTextBlockEffectiveStyle(
  props: TextBlockResolvedProps,
  context: NovaUiStyleContext,
  explicitTopLevelMask: NovaUiStyleMask,
): NovaUiInheritedTextStyle {
  const localStyle = props.style

  return {
    color: resolveStyleValue(
      explicitTopLevelMask,
      NovaUiStyleMask.Color,
      props.color,
      localStyle?.color,
      context.values.color,
    ),
    fontFamily: resolveStyleValue(
      explicitTopLevelMask,
      NovaUiStyleMask.FontFamily,
      props.fontFamily,
      localStyle?.fontFamily,
      context.values.fontFamily,
    ),
    fontSize: resolveStyleValue(
      explicitTopLevelMask,
      NovaUiStyleMask.FontSize,
      props.fontSize,
      localStyle?.fontSize,
      context.values.fontSize,
    ),
    fontWeight: resolveStyleValue(
      explicitTopLevelMask,
      NovaUiStyleMask.FontWeight,
      props.fontWeight,
      localStyle?.fontWeight,
      context.values.fontWeight,
    ),
    fontStyle: resolveStyleValue(
      explicitTopLevelMask,
      NovaUiStyleMask.FontStyle,
      props.fontStyle,
      localStyle?.fontStyle,
      context.values.fontStyle,
    ),
    lineHeight: resolveStyleValue(
      explicitTopLevelMask,
      NovaUiStyleMask.LineHeight,
      props.lineHeight,
      localStyle?.lineHeight,
      context.values.lineHeight,
    ),
  }
}

function resolveStyleValue<T>(
  explicitTopLevelMask: NovaUiStyleMask,
  keyMask: NovaUiStyleMask,
  explicitValue: T,
  localStyleValue: T | undefined,
  inheritedValue: T | undefined,
): T {
  if ((explicitTopLevelMask & keyMask) !== 0) {
    return explicitValue
  }
  return localStyleValue ?? inheritedValue ?? explicitValue
}
