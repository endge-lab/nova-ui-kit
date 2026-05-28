import {
  NovaComponentNode,
  type NovaApp,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  TEXT_BLOCK_NODE_DESCRIPTOR,
  type TextBlockDescriptor,
} from '@/components/TextBlock/text-block.config'
import { buildTextBlockSchema } from '@/components/TextBlock/text-block.schema'
import { layoutTextBlock, normalizeTextBlockProps } from '@/components/TextBlock/text-block-layout'
import {
  type TextBlockApi,
  type TextBlockLayout,
  type TextBlockMeasureFn,
  type TextBlockProps,
  type TextBlockResolvedProps,
} from '@/components/TextBlock/text-block.types'
import {
  NOVA_UI_LAYOUT_TARGET,
  TextMeasureCache,
  clampLayoutNumber,
  copyRect,
  createLayoutRect,
  measureNovaUiTextWidth,
  rectEquals,
  relayoutNovaUiLayoutAncestors,
  type NovaUiLayoutConstraints,
  type NovaUiLayoutMeasure,
  type NovaUiLayoutRect,
  type NovaUiLayoutTarget,
} from '@/shared/layout'
import {
  EMPTY_STYLE_CONTEXT,
  NOVA_UI_STYLE_TARGET,
  NovaUiStyleMask,
  diffInheritedTextStyle,
  inheritedTextStyleMask,
  type NovaUiInheritedTextStyle,
  type NovaUiStyleContext,
  type NovaUiStyleReceiveResult,
  type NovaUiStyleTarget,
} from '@/shared/style'
import {
  ensureNovaUIKitThemes,
  resolveNovaUiThemeValue,
} from '@/shared/style/nova-ui-kit-theme'
import { isNovaUiMotionEnabled, resolveNovaUiMotionOptions } from '@/shared/motion'

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

  private readonly layoutRect = createLayoutRect()
  private readonly textMeasureCache = new TextMeasureCache()
  private _layout: TextBlockLayout | null = null
  private readonly _api: TextBlockApi
  private externalLayout = false
  private inheritedStyleContext = EMPTY_STYLE_CONTEXT
  private explicitTopLevelStyleMask = NovaUiStyleMask.None
  private localStyleMask = NovaUiStyleMask.None
  private effectiveTextStyle: NovaUiInheritedTextStyle = {}

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
    this.applyDisplayState()
    this.explicitTopLevelStyleMask = textBlockTopLevelStyleMask(props)
    this.localStyleMask = inheritedTextStyleMask(resolvedProps.style)
    this.effectiveTextStyle = resolveTextBlockEffectiveStyle(
      resolvedProps,
      this.inheritedStyleContext,
      this.explicitTopLevelStyleMask,
    )
    this.applyInitialLayoutRect(resolvedProps)
    this._layout = this.computeLayout()
    this._api = {
      setText: text => this.setProps({ text }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.resolveCurrentLayoutProps(),
      measure: () => this.ensureLayout(),
      getLines: () => this.ensureLayout().lines,
      isOverflowed: () => this.ensureLayout().overflowed,
    }
    if (isNovaUiMotionEnabled(props) && props.motion === 'fadeIn') {
      this.fadeIn({ to: resolvedProps.opacity })
    }
  }

  /**
   * Обновляет значение состояния TextBlock.
   */
  override setProps(patch: TextBlockProps): this {
    this.explicitTopLevelStyleMask |= textBlockTopLevelStyleMask(patch)
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
    this.externalLayout = true
    return this.applyResolvedRect(rect)
  }

  /** Принимает inherited style context и выбирает update/render по bitmask. */
  receiveStyleContext(context: NovaUiStyleContext, changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    this.inheritedStyleContext = context
    const previousStyle = this.effectiveTextStyle
    const nextStyle = resolveTextBlockEffectiveStyle(this.props, context, this.explicitTopLevelStyleMask)
    const affectedMask = changedMask & this.getSubtreeStyleMask()
    const effectiveChangedMask = diffInheritedTextStyle(previousStyle, nextStyle, affectedMask)

    if (effectiveChangedMask === NovaUiStyleMask.None) {return {
      update: false,
      render: false,
      layout: false,
    }}

    this.effectiveTextStyle = nextStyle

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
    return TEXT_BLOCK_CONSUMED_STYLE_MASK & ~(this.explicitTopLevelStyleMask | this.localStyleMask)
  }

  /** Измеряет preferred size для auto layout с учетом constraints. */
  measureLayout(constraints: NovaUiLayoutConstraints): NovaUiLayoutMeasure {
    const fallbackWidth = this.layoutRect.width || this.props.width
    const width = clampLayoutNumber(
      fallbackWidth,
      constraints.minWidth,
      constraints.maxWidth,
    )
    const heightLimit = Number.isFinite(constraints.maxHeight)
      ? constraints.maxHeight
      : Math.max(this.layoutRect.height, this.props.height)
    const props = this.resolveLayoutProps(width, heightLimit)
    const layout = layoutTextBlock(props, this.measureText)
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
    this._layout = this.computeLayout()
  }

  /**
   * Выполняет отрисовку TextBlock.
   */
  render(): void {
    this.renderSchema(buildTextBlockSchema(this.resolveThemeLayoutProps(this.resolveCurrentLayoutProps()), this.measureText, 'node'))
  }

  /**
   * Обрабатывает входящее событие TextBlock.
   */
  protected override onPropsChanged(changedKeys: Array<keyof TextBlockResolvedProps>): void {
    const previousStyle = this.effectiveTextStyle
    this.props = normalizeTextBlockProps(this.props)
    this.localStyleMask = inheritedTextStyleMask(this.props.style)
    this.effectiveTextStyle = resolveTextBlockEffectiveStyle(
      this.props,
      this.inheritedStyleContext,
      this.explicitTopLevelStyleMask,
    )
    const styleChangedMask = diffInheritedTextStyle(previousStyle, this.effectiveTextStyle)
    this.applyDisplayState()
    if (changedKeys.includes('display')) this.markLayoutAncestorsDirty()
    if (hasTextBlockLayoutChanges(changedKeys) || (styleChangedMask & TEXT_BLOCK_LAYOUT_STYLE_MASK) !== 0) {
      this._layout = null
    }
    if ((styleChangedMask & TEXT_BLOCK_LAYOUT_STYLE_MASK) !== 0) {
      this.dirty({ update: true, render: true })
    }
    if (!this.externalLayout && hasGeometryChanges(changedKeys)) {
      this.applyResolvedRect({
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
  private applyInitialLayoutRect(props: TextBlockResolvedProps): void {
    copyRect(this.layoutRect, {
      x: props.x,
      y: props.y,
      width: props.width,
      height: props.height,
    })
    super.options({
      x: this.layoutRect.x,
      y: this.layoutRect.y,
      width: this.layoutRect.width,
      height: this.layoutRect.height,
    })
  }

  /**
   * Применяет подготовленное состояние TextBlock.
   */
  private applyResolvedRect(rect: NovaUiLayoutRect): boolean {
    if (rectEquals(this.layoutRect, rect)) return false

    const sizeChanged = this.layoutRect.width !== rect.width || this.layoutRect.height !== rect.height
    copyRect(this.layoutRect, rect)
    super.options({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    })
    if (sizeChanged) this._layout = null
    this.dirty({ matrix: true, update: sizeChanged, render: true })
    return true
  }

  /**
   * Выполняет внутренний шаг ensureLayout для TextBlock.
   */
  private ensureLayout(): TextBlockLayout {
    if (!this._layout) this._layout = this.computeLayout()
    return this._layout
  }

  /**
   * Вычисляет производное значение TextBlock.
   */
  private computeLayout(): TextBlockLayout {
    return layoutTextBlock(this.resolveCurrentLayoutProps(), this.measureText)
  }

  /**
   * Нормализует и возвращает итоговое значение TextBlock.
   */
  private resolveCurrentLayoutProps(): TextBlockResolvedProps {
    return this.resolveLayoutProps(this.layoutRect.width, this.layoutRect.height)
  }

  /**
   * Нормализует и возвращает итоговое значение TextBlock.
   */
  private resolveLayoutProps(width: number, height: number): TextBlockResolvedProps {
    return {
      ...this.props,
      x: 0,
      y: 0,
      width: Math.max(0, width),
      height: Math.max(0, height),
      color: this.effectiveTextStyle.color ?? this.props.color,
      fontFamily: this.effectiveTextStyle.fontFamily ?? this.props.fontFamily,
      fontSize: this.effectiveTextStyle.fontSize ?? this.props.fontSize,
      fontWeight: this.effectiveTextStyle.fontWeight ?? this.props.fontWeight,
      fontStyle: this.effectiveTextStyle.fontStyle ?? this.props.fontStyle,
      lineHeight: this.effectiveTextStyle.lineHeight ?? this.props.lineHeight,
    }
  }

  private resolveThemeLayoutProps(props: TextBlockResolvedProps): TextBlockResolvedProps {
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

  private readonly measureText: TextBlockMeasureFn = (text, options) => (
    this.textMeasureCache.get(
      `${options.fontFamily}|${options.fontSize}|${options.fontWeight}|${options.fontStyle}|${text}`,
      () => measureNovaUiTextWidth(text, options),
    )
  )

  /**
   * Применяет подготовленное состояние TextBlock.
   */
  private applyDisplayState(): void {
    const displayed = this.props.display !== 'none'
    this.visible = displayed
    this.active = displayed
  }

  /**
   * Выполняет внутренний шаг markLayoutAncestorsDirty для TextBlock.
   */
  private markLayoutAncestorsDirty(): void {
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

  if (props.color !== undefined) mask |= NovaUiStyleMask.Color
  if (props.fontFamily !== undefined) mask |= NovaUiStyleMask.FontFamily
  if (props.fontSize !== undefined) mask |= NovaUiStyleMask.FontSize
  if (props.fontWeight !== undefined) mask |= NovaUiStyleMask.FontWeight
  if (props.fontStyle !== undefined) mask |= NovaUiStyleMask.FontStyle
  if (props.lineHeight !== undefined) mask |= NovaUiStyleMask.LineHeight

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
  if ((explicitTopLevelMask & keyMask) !== 0) return explicitValue
  return localStyleValue ?? inheritedValue ?? explicitValue
}
