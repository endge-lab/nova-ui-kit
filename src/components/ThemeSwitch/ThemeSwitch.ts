import { NovaComponentNode, type NovaApp, type NovaSchema, type NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import { normalizeButtonProps } from '@/components/Button/button.config'
import { buildButtonSchema } from '@/components/Button/button-render'
import {
  THEME_SWITCH_NODE_DESCRIPTOR,
  normalizeThemeSwitchProps,
  type ThemeSwitchDescriptor,
} from '@/components/ThemeSwitch/theme-switch.config'
import {
  ensureNovaUIKitThemes,
  resolveNovaUiThemeValue,
} from '@/shared/style/nova-ui-kit-theme'
import {
  NOVA_UI_LAYOUT_TARGET,
  type NovaUiLayoutConstraints,
  type NovaUiLayoutMeasure,
  resolveNovaUiPositionedRect,
  type NovaUiLayoutRect,
} from '@/shared/layout'
import { NovaUiStyleMask } from '@/shared/style'
import type {
  ThemeSwitchApi,
  ThemeSwitchProps,
  ThemeSwitchResolvedProps,
  ThemeSwitchTheme,
} from '@/components/ThemeSwitch/theme-switch.types'

/** Переиспользуемый переключатель тем Nova. */
export class ThemeSwitch<E extends EventList = Record<string, any>>
  extends NovaComponentNode<ThemeSwitchResolvedProps, ThemeSwitchApi, Record<string, never>, ThemeSwitchProps, E> {
  readonly [NOVA_UI_LAYOUT_TARGET] = true as const

  private readonly api: ThemeSwitchApi
  private hovered = false
  private pressed = false
  private externalLayout = false

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ThemeSwitchProps = {},
    options: { componentId?: string } = {},
    descriptor: ThemeSwitchDescriptor = THEME_SWITCH_NODE_DESCRIPTOR,
  ) {
    ensureNovaUIKitThemes(app)
    super(app, surface, descriptor, normalizeThemeSwitchProps(props), options)
    this.addDisposer(app.theme.observe(this, { phase: 'render' }))
    this.api = {
      next: () => this.nextTheme(),
      setValue: value => this.setProps({ value }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: true, cursor: 'pointer', zIndex: 2001 })
    this.setupEvents()
    this.applyPlacement()
  }

  override setProps(patch: ThemeSwitchProps): this {
    return super.setProps(patch as Partial<ThemeSwitchResolvedProps>)
  }

  override getApi(): ThemeSwitchApi {
    return this.api
  }

  update(): void {
    if (!this.externalLayout) this.applyPlacement()
  }

  /** Принимает rect от UI Kit layout-контейнера. */
  applyLayoutRect(rect: NovaUiLayoutRect): boolean {
    this.externalLayout = true
    const sizeChanged = this.width !== rect.width || this.height !== rect.height
    const changed = this.x !== rect.x
      || this.y !== rect.y
      || sizeChanged
    this.options({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      interactive: this.props.visible,
      zIndex: this.props.zIndex,
    })
    this.setLocalRenderBounds({ x: 0, y: 0, width: rect.width, height: rect.height })
    if (changed) this.dirty({ matrix: true, update: sizeChanged, render: true })
    return changed
  }

  /** Возвращает preferred size для flow layout. */
  measureLayout(_constraints: NovaUiLayoutConstraints): NovaUiLayoutMeasure {
    return { width: this.props.width, height: this.props.height }
  }

  render(): void {
    if (!this.props.visible) {
      this.renderer.schema([] as unknown as NovaSchema)
      return
    }

    const theme = this.currentTheme()
    const buttonProps = normalizeButtonProps({
      width: this.width,
      height: this.height,
      size: 'md',
      icon: theme?.icon,
      text: theme?.icon ? '' : theme?.label?.slice(0, 2).toUpperCase() ?? 'T',
      iconPlacement: 'only',
      background: theme?.background,
    })
    this.renderer.schema(buildButtonSchema(buttonProps, this.width, this.height, {
      values: {},
      mask: NovaUiStyleMask.None,
      version: 0,
    }, {
      hovered: this.hovered,
      pressed: this.pressed,
    }, value => resolveNovaUiThemeValue(this.nova, value)))
  }

  protected override onPropsChanged(): void {
    this.props = normalizeThemeSwitchProps(this.props)
    this.options({ interactive: this.props.visible, zIndex: this.props.zIndex })
    if (!this.externalLayout) this.applyPlacement()
  }

  private setupEvents(): void {
    this.on('mouseenter', () => {
      if (!this.props.visible) return
      this.hovered = true
      this.dirty({ render: true })
    })
    this.on('mousedown', () => {
      if (!this.props.visible) return false
      this.pressed = true
      this.nextTheme()
      this.dirty({ render: true })
      return false
    })
    this.on('mouseup', () => {
      if (!this.pressed) return false
      this.pressed = false
      this.dirty({ render: true })
      return false
    })
    this.on('mouseleave', () => {
      this.hovered = false
      if (!this.pressed) return
      this.pressed = false
      this.dirty({ render: true })
    })
  }

  private currentTheme(): ThemeSwitchTheme | undefined {
    const active = this.props.value ?? this.nova.theme.active()
    return this.props.themes.find(theme => theme.id === active) ?? this.props.themes[0]
  }

  private nextTheme(): void {
    if (this.props.themes.length === 0) return
    const current = this.currentTheme()
    const index = Math.max(0, this.props.themes.findIndex(theme => theme.id === current?.id))
    const next = this.props.themes[(index + 1) % this.props.themes.length]
    if (!next) return

    if (this.props.value === undefined) {
      try {
        this.nova.theme.use(next.id)
      } catch {
        // ThemeSwitch can still work as controlled component when theme service has no such id.
      }
    }
    this.props.onChange?.(next.id)
  }

  private applyPlacement(): void {
    const rect = resolveOverlayRect(this.surface.width, this.surface.height, this.props)
    const nextX = rect.x ?? this.x
    const nextY = rect.y ?? this.y
    const sizeChanged = this.width !== rect.width || this.height !== rect.height
    const changed = this.x !== nextX || this.y !== nextY || sizeChanged
    this.options({
      ...(rect.x !== undefined && rect.y !== undefined ? { x: rect.x, y: rect.y } : {}),
      width: rect.width,
      height: rect.height,
      interactive: this.props.visible,
      zIndex: this.props.zIndex,
    })
    this.setLocalRenderBounds({ x: 0, y: 0, width: rect.width, height: rect.height })
    if (changed) this.dirty({ matrix: true, update: sizeChanged, render: true })
  }
}

function resolveOverlayRect(rootWidth: number, rootHeight: number, props: ThemeSwitchResolvedProps): { x?: number; y?: number; width: number; height: number } {
  const width = props.width
  const height = props.height
  if (typeof props.x === 'number' && typeof props.y === 'number') return { x: props.x, y: props.y, width, height }
  if (props.position !== 'static') {
    return resolveNovaUiPositionedRect(
      { x: 0, y: 0, width: rootWidth, height: rootHeight },
      { x: 0, y: 0, width, height },
      props,
    ) as NovaUiLayoutRect
  }
  if (!props.placement) return { width, height }
  const left = props.placement.endsWith('left')
  const top = props.placement.startsWith('top')
  return {
    x: left ? props.margin : Math.max(0, rootWidth - props.margin - width),
    y: top ? props.margin : Math.max(0, rootHeight - props.margin - height),
    width,
    height,
  }
}
