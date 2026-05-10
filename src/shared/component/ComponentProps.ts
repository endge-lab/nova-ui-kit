import type { NovaComponentSchema, NovaSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { NovaUiMotionOptions } from '@/domain/domain.types'
import {
  NOVA_UI_LAYOUT_TARGET,
  applyNodeLayoutRect,
  copyRect,
  createLayoutRect,
  rectEquals,
  resolveSpacing,
  type NovaUiLayoutRect,
  type NovaUiLayoutTarget,
  type NovaUiSpacing,
} from '@/shared/layout'
import {
  EMPTY_STYLE_CONTEXT,
  NOVA_UI_STYLE_TARGET,
  NovaUiStyleMask,
  borderRadiusToRendererValue,
  mergeStyleContext,
  type NovaUiBorder,
  type NovaUiFontStyle,
  type NovaUiFontWeight,
  type NovaUiInheritedTextStyle,
  type NovaUiStyleContext,
  type NovaUiStyleIdentityProps,
  type NovaUiStyleReceiveResult,
  type NovaUiStyleTarget,
} from '@/shared/style'
import { NovaComponentNode, type NovaApp, type NovaSurface } from '@endge/nova'
import type { NovaComponentDescriptor } from '@endge/nova'
import { requireNovaUiRoot } from '@/components/Root/RootTarget'

export type NovaUiComponentSize = 'sm' | 'md' | 'lg'
export type NovaUiOrientation = 'horizontal' | 'vertical'
export type NovaUiIconSource = CanvasImageSource | string

export interface NovaUiCommonProps extends NovaUiMotionOptions, NovaUiStyleIdentityProps {
  x?: number
  y?: number
  width?: number
  height?: number
  style?: NovaUiInheritedTextStyle
  color?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: NovaUiFontWeight
  fontStyle?: NovaUiFontStyle
  lineHeight?: number
  background?: string
  opacity?: number
  border?: NovaUiBorder
  clip?: boolean
  padding?: NovaUiSpacing
  accentColor?: string
  trackColor?: string
  thumbColor?: string
  hoverBackground?: string
  pressedBackground?: string
  activeBackground?: string
  disabled?: boolean
  disabledOpacity?: number
}

export interface NovaUiCommonResolvedProps extends NovaUiStyleIdentityProps {
  x: number
  y: number
  width: number
  height: number
  style?: NovaUiInheritedTextStyle
  color?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: NovaUiFontWeight
  fontStyle?: NovaUiFontStyle
  lineHeight?: number
  background?: string
  opacity: number
  border?: NovaUiBorder
  clip: boolean
  padding: NovaUiSpacing
  accentColor?: string
  trackColor?: string
  thumbColor?: string
  hoverBackground?: string
  pressedBackground?: string
  activeBackground?: string
  disabled: boolean
  disabledOpacity: number
}

export interface NovaUiInteractionState {
  hovered: boolean
  pressed: boolean
  focused: boolean
}

export interface NovaUiTextStyleDefaults {
  color: string
  fontFamily: string
  fontSize: number
  fontWeight: NovaUiFontWeight
  fontStyle: NovaUiFontStyle
  lineHeight: number
}

export const NOVA_UI_DEFAULT_TEXT_STYLE: NovaUiTextStyleDefaults = {
  color: '#172033',
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: 13,
  fontWeight: '500',
  fontStyle: 'normal',
  lineHeight: 18,
}

export const NOVA_UI_COMMON_FIELD_DEFINITIONS = {
  x: { type: 'number' },
  y: { type: 'number' },
  width: { type: 'number' },
  height: { type: 'number' },
  style: { type: 'style' },
  color: { type: 'string' },
  fontFamily: { type: 'string' },
  fontSize: { type: 'number' },
  fontWeight: { type: 'string' },
  fontStyle: { type: 'string' },
  lineHeight: { type: 'number' },
  background: { type: 'string' },
  opacity: { type: 'number' },
  border: { type: 'border' },
  clip: { type: 'boolean' },
  padding: { type: 'spacing' },
  accentColor: { type: 'string' },
  trackColor: { type: 'string' },
  thumbColor: { type: 'string' },
  hoverBackground: { type: 'string' },
  pressedBackground: { type: 'string' },
  activeBackground: { type: 'string' },
  disabled: { type: 'boolean' },
  disabledOpacity: { type: 'number' },
  motion: { type: 'motion' },
  className: { type: 'string' },
  attrs: { type: 'record' },
} as const

export const NOVA_UI_COMMON_DIRTY_POLICY = {
  matrix: ['x', 'y'] as const,
  update: ['width', 'height', 'padding'] as const,
  render: [
    'style',
    'color',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'lineHeight',
    'background',
    'opacity',
    'border',
    'clip',
    'accentColor',
    'trackColor',
    'thumbColor',
    'hoverBackground',
    'pressedBackground',
    'activeBackground',
    'disabled',
    'disabledOpacity',
    'className',
    'attrs',
  ] as const,
}

export function normalizeCommonProps<TProps extends NovaUiCommonProps>(
  props: TProps = {} as TProps,
  defaults: Partial<NovaUiCommonResolvedProps> = {},
): NovaUiCommonResolvedProps {
  return {
    x: finiteNumber(props.x, defaults.x ?? 0),
    y: finiteNumber(props.y, defaults.y ?? 0),
    width: Math.max(0, finiteNumber(props.width, defaults.width ?? 0)),
    height: Math.max(0, finiteNumber(props.height, defaults.height ?? 0)),
    style: props.style ?? defaults.style,
    color: props.color ?? defaults.color,
    fontFamily: props.fontFamily ?? defaults.fontFamily,
    fontSize: finiteOptionalNumber(props.fontSize, defaults.fontSize),
    fontWeight: props.fontWeight ?? defaults.fontWeight,
    fontStyle: props.fontStyle ?? defaults.fontStyle,
    lineHeight: finiteOptionalNumber(props.lineHeight, defaults.lineHeight),
    background: props.background ?? defaults.background,
    opacity: clamp01(finiteNumber(props.opacity, defaults.opacity ?? 1)),
    border: props.border ?? defaults.border,
    clip: props.clip ?? defaults.clip ?? false,
    padding: props.padding ?? defaults.padding ?? 0,
    accentColor: props.accentColor ?? defaults.accentColor,
    trackColor: props.trackColor ?? defaults.trackColor,
    thumbColor: props.thumbColor ?? defaults.thumbColor,
    hoverBackground: props.hoverBackground ?? defaults.hoverBackground,
    pressedBackground: props.pressedBackground ?? defaults.pressedBackground,
    activeBackground: props.activeBackground ?? defaults.activeBackground,
    disabled: props.disabled ?? defaults.disabled ?? false,
    disabledOpacity: clamp01(finiteNumber(props.disabledOpacity, defaults.disabledOpacity ?? 0.45)),
    className: props.className ?? defaults.className,
    attrs: props.attrs ?? defaults.attrs,
  }
}

export function resolveComponentTextStyle(
  props: NovaUiCommonResolvedProps,
  context: NovaUiStyleContext,
  defaults: Partial<NovaUiTextStyleDefaults> = {},
): NovaUiTextStyleDefaults {
  const inherited = mergeStyleContext(context, props.style).values

  return {
    color: props.color ?? inherited.color ?? defaults.color ?? NOVA_UI_DEFAULT_TEXT_STYLE.color,
    fontFamily: props.fontFamily ?? inherited.fontFamily ?? defaults.fontFamily ?? NOVA_UI_DEFAULT_TEXT_STYLE.fontFamily,
    fontSize: props.fontSize ?? inherited.fontSize ?? defaults.fontSize ?? NOVA_UI_DEFAULT_TEXT_STYLE.fontSize,
    fontWeight: props.fontWeight ?? inherited.fontWeight ?? defaults.fontWeight ?? NOVA_UI_DEFAULT_TEXT_STYLE.fontWeight,
    fontStyle: props.fontStyle ?? inherited.fontStyle ?? defaults.fontStyle ?? NOVA_UI_DEFAULT_TEXT_STYLE.fontStyle,
    lineHeight: props.lineHeight ?? inherited.lineHeight ?? defaults.lineHeight ?? NOVA_UI_DEFAULT_TEXT_STYLE.lineHeight,
  }
}

export function createStateAttrs(
  props: NovaUiCommonResolvedProps,
  state: Partial<NovaUiInteractionState> & Record<string, string | number | boolean | undefined> = {},
): Record<string, string | number | boolean> {
  const attrs: Record<string, string | number | boolean> = {
    ...(props.attrs ?? {}),
  }

  if (props.disabled) attrs.disabled = true
  for (const [key, value] of Object.entries(state)) {
    if (value !== undefined) attrs[key] = value
  }
  return attrs
}

export function resolveInteractionBackground(
  props: NovaUiCommonResolvedProps,
  state: Partial<NovaUiInteractionState> & { active?: boolean } = {},
): string | undefined {
  if (props.disabled) return props.background
  if (state.pressed && props.pressedBackground) return props.pressedBackground
  if (state.active && props.activeBackground) return props.activeBackground
  if (state.hovered && props.hoverBackground) return props.hoverBackground
  return props.background
}

export function buildBoxSchema(
  props: NovaUiCommonResolvedProps,
  width: number,
  height: number,
  options: {
    background?: string
    opacity?: number
    border?: NovaUiBorder
    radiusFallback?: number
  } = {},
): NovaSchema {
  const schema: NovaSchema = []
  const background = options.background ?? props.background
  const opacity = options.opacity ?? (props.disabled ? props.disabledOpacity : props.opacity)
  const border = options.border ?? props.border

  if (background) {
    schema.push({
      type: 'rect',
      x: 0,
      y: 0,
      width,
      height,
      styles: {
        background,
        opacity,
        border: border?.width
          ? {
              color: border.color ?? '#d6d9e2',
              width: border.width,
              radius: borderRadiusToRendererValue(border.radius ?? options.radiusFallback ?? 0),
            }
          : undefined,
      },
    })
  }

  if (border?.width && !background) {
    schema.push({
      type: 'border',
      x: 0,
      y: 0,
      width,
      height,
      styles: {
        color: border.color ?? '#d6d9e2',
        width: border.width,
        radius: borderRadiusToRendererValue(border.radius ?? options.radiusFallback ?? 0),
      },
    })
  }

  return schema
}

export function applyChildRect(
  child: unknown,
  rect: NovaUiLayoutRect,
): boolean {
  if (!child || typeof child !== 'object') return false
  return applyNodeLayoutRect(child as Parameters<typeof applyNodeLayoutRect>[0], rect)
}

export function commonMeasureBounds<TProps extends NovaUiCommonProps>(
  schema: NovaComponentSchema<TProps>,
  normalize: (props: TProps) => NovaUiCommonResolvedProps,
): NovaUiLayoutRect {
  const props = normalize((schema.props ?? {}) as TProps)
  return {
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
  }
}

export abstract class NovaUiComponentNode<
  TProps extends NovaUiCommonResolvedProps,
  TApi,
  TSchema extends NovaUiCommonProps,
  E extends EventList = Record<string, any>,
> extends NovaComponentNode<TProps, TApi, Record<string, never>, TSchema, E>
  implements NovaUiLayoutTarget, NovaUiStyleTarget {
  readonly [NOVA_UI_LAYOUT_TARGET] = true as const
  readonly [NOVA_UI_STYLE_TARGET] = true as const

  protected readonly layoutRect = createLayoutRect()
  protected inheritedStyleContext = EMPTY_STYLE_CONTEXT
  protected externalLayout = false

  protected constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    descriptor: NovaComponentDescriptor<TProps, TApi, Record<string, never>, TSchema>,
    props: TProps,
    options: { componentId?: string } = {},
  ) {
    super(app, surface, descriptor, props, options)
    this.applyInitialLayoutRect(props)
    this.options({
      opacity: props.disabled ? props.disabledOpacity : props.opacity,
    })
  }

  applyLayoutRect(rect: NovaUiLayoutRect): boolean {
    this.externalLayout = true
    return this.applyResolvedRect(rect)
  }

  receiveStyleContext(context: NovaUiStyleContext, changedMask: NovaUiStyleMask): NovaUiStyleReceiveResult {
    this.inheritedStyleContext = context
    if ((changedMask & NovaUiStyleMask.AllText) === 0) {
      return { update: false, render: false, layout: false }
    }

    this.dirty({ update: true, render: true })
    return { update: true, render: true, layout: true }
  }

  getSubtreeStyleMask(): NovaUiStyleMask {
    return NovaUiStyleMask.AllText
  }

  protected override onMount(): void {
    requireNovaUiRoot(this)
  }

  protected applyCommonPropsChanged(changedKeys: (keyof TProps)[]): void {
    this.options({
      opacity: this.props.disabled ? this.props.disabledOpacity : this.props.opacity,
    })

    if (!this.externalLayout && hasGeometryChanges(changedKeys)) {
      this.applyResolvedRect({
        x: this.props.x,
        y: this.props.y,
        width: this.props.width,
        height: this.props.height,
      })
    }
  }

  protected applyInitialLayoutRect(props: TProps): void {
    copyRect(this.layoutRect, {
      x: props.x,
      y: props.y,
      width: props.width,
      height: props.height,
    })
    super.options({
      x: props.x,
      y: props.y,
      width: props.width,
      height: props.height,
    })
  }

  protected applyResolvedRect(rect: NovaUiLayoutRect): boolean {
    if (rectEquals(this.layoutRect, rect)) return false

    const sizeChanged = this.layoutRect.width !== rect.width || this.layoutRect.height !== rect.height
    copyRect(this.layoutRect, rect)
    super.options({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    })
    this.dirty({ matrix: true, update: sizeChanged, render: true })
    return true
  }

  protected getResolvedPadding(): ReturnType<typeof resolveSpacing> {
    return resolveSpacing(this.props.padding)
  }
}

export function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function finiteOptionalNumber(value: number | undefined, fallback?: number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return fallback
}

export function finiteInteger(value: number | undefined, fallback: number): number {
  return Math.trunc(finiteNumber(value, fallback))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

export function roundToStep(value: number, min: number, step: number): number {
  if (step <= 0) return value
  return min + Math.round((value - min) / step) * step
}

function hasGeometryChanges(keys: readonly PropertyKey[]): boolean {
  return keys.includes('x') || keys.includes('y') || keys.includes('width') || keys.includes('height')
}
