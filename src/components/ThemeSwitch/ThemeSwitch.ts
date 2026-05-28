import { NovaComponentNode, type NovaApp, type NovaSchema, type NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  THEME_SWITCH_NODE_DESCRIPTOR,
  normalizeThemeSwitchProps,
  type ThemeSwitchDescriptor,
} from '@/components/ThemeSwitch/theme-switch.config'
import {
  resolveNovaUiPositionedRect,
  type NovaUiLayoutRect,
} from '@/shared/layout'
import { THEME_SWITCH_ASSETS } from '@/components/ThemeSwitch/theme-switch-assets'
import type {
  ThemeSwitchApi,
  ThemeSwitchProps,
  ThemeSwitchResolvedProps,
  ThemeSwitchTheme,
} from '@/components/ThemeSwitch/theme-switch.types'

/** Переиспользуемый переключатель тем Nova. */
export class ThemeSwitch<E extends EventList = Record<string, any>>
  extends NovaComponentNode<ThemeSwitchResolvedProps, ThemeSwitchApi, Record<string, never>, ThemeSwitchProps, E> {
  private readonly api: ThemeSwitchApi
  private pressed = false
  private assetsRegistered = false

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ThemeSwitchProps = {},
    options: { componentId?: string } = {},
    descriptor: ThemeSwitchDescriptor = THEME_SWITCH_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeThemeSwitchProps(props), options)
    this.api = {
      next: () => this.nextTheme(),
      setValue: value => this.setProps({ value }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: true, cursor: 'pointer', zIndex: 2001 })
    this.registerAssets()
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
    this.applyPlacement()
  }

  render(): void {
    if (!this.props.visible) {
      this.renderer.schema([] as unknown as NovaSchema)
      return
    }

    const theme = this.currentTheme()
    const background = theme?.background ?? (this.pressed ? 'rgba(241,245,249,0.98)' : 'rgba(255,255,255,0.94)')
    const schema: NovaSchema = []
    schema.push({
      type: 'rect',
      x: 0,
      y: 0,
      width: this.props.width,
      height: this.props.height,
      styles: {
        background,
        border: { color: '#cbd5e1', width: 1, radius: 8 },
      },
    })

    if (theme?.icon) {
      schema.push({
        type: 'icon',
        icon: theme.icon,
        x: (this.props.width - 18) / 2,
        y: (this.props.height - 18) / 2,
        width: 18,
        height: 18,
        styles: { quality: 'crisp' },
      })
    } else if (!theme?.icon) {
      schema.push({
        type: 'text',
        text: theme?.label?.slice(0, 2).toUpperCase() ?? 'T',
        x: 0,
        y: 0,
        width: this.props.width,
        height: this.props.height,
        styles: {
          color: '#111827',
          font: { family: 'Inter, Arial, sans-serif', size: 11, weight: '900' },
          align: { horizontal: 'center', vertical: 'middle' },
        },
      })
    }

    this.renderer.schema(schema)
  }

  protected override onPropsChanged(): void {
    this.props = normalizeThemeSwitchProps(this.props)
    this.applyPlacement()
  }

  protected override onMount(): void {
    this.registerAssets()
    super.onMount()
  }

  protected override onUnmount(): void {
    if (this.assetsRegistered) {
      this.nova.assets.unuse(THEME_SWITCH_ASSETS)
      this.assetsRegistered = false
    }
    super.onUnmount()
  }

  private registerAssets(): void {
    if (this.assetsRegistered) return
    this.nova.assets.use(THEME_SWITCH_ASSETS)
    this.assetsRegistered = true
  }

  private setupEvents(): void {
    this.on('mousedown', () => {
      if (!this.props.visible) return false
      this.pressed = true
      this.dirty({ render: true })
      return false
    })
    this.on('mouseup', () => {
      if (!this.pressed) return false
      this.pressed = false
      this.nextTheme()
      this.dirty({ render: true })
      return false
    })
    this.on('mouseleave', () => {
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
    this.options({
      ...(rect.x !== undefined && rect.y !== undefined ? { x: rect.x, y: rect.y } : {}),
      width: rect.width,
      height: rect.height,
      interactive: this.props.visible,
      zIndex: this.props.zIndex,
    })
    this.setLocalRenderBounds({ x: 0, y: 0, width: rect.width, height: rect.height })
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
