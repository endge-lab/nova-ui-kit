import { NovaComponentNode, type NovaApp, type NovaSchema, type NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  FPS_METER_NODE_DESCRIPTOR,
  normalizeFpsMeterProps,
  type FpsMeterDescriptor,
} from '@/components/FpsMeter/fps-meter.config'
import {
  resolveNovaUiPositionedRect,
  type NovaUiLayoutRect,
} from '@/shared/layout'
import type {
  FpsMeterApi,
  FpsMeterProps,
  FpsMeterResolvedProps,
} from '@/components/FpsMeter/fps-meter.types'
import {
  ensureNovaUIKitThemes,
  resolveNovaUiThemeValue,
} from '@/shared/style/nova-ui-kit-theme'

/** Универсальный overlay-счетчик FPS для Nova-canvas. */
export class FpsMeter<E extends EventList = Record<string, any>>
  extends NovaComponentNode<FpsMeterResolvedProps, FpsMeterApi, Record<string, never>, FpsMeterProps, E> {
  private readonly api: FpsMeterApi
  private intervalId: ReturnType<typeof setInterval> | undefined

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: FpsMeterProps = {},
    options: { componentId?: string } = {},
    descriptor: FpsMeterDescriptor = FPS_METER_NODE_DESCRIPTOR,
  ) {
    ensureNovaUIKitThemes(app)
    super(app, surface, descriptor, normalizeFpsMeterProps(props), options)
    this.addDisposer(app.theme.observe(this, { phase: 'render' }))
    this.api = {
      setVisible: visible => this.setProps({ visible }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.applyPlacement()
  }

  override setProps(patch: FpsMeterProps): this {
    return super.setProps(patch as Partial<FpsMeterResolvedProps>)
  }

  override getApi(): FpsMeterApi {
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

    const fps = Math.max(0, Math.min(999, Math.round(this.nova.metrics.snapshot().rFps || 0)))
    const schema: NovaSchema = []
    const minimal = this.props.variant === 'minimal'
    schema.push({
      type: 'rect',
      x: 0,
      y: 0,
      width: this.props.width,
      height: this.props.height,
      styles: {
        background: resolveNovaUiThemeValue(this.nova, minimal ? 'var(--nova-fps-meter-minimal-background, rgba(17,24,39,0.66))' : 'var(--nova-fps-meter-background, rgba(17,24,39,0.82))'),
        border: { color: resolveNovaUiThemeValue(this.nova, 'var(--nova-fps-meter-border-color, rgba(255,255,255,0.14))'), width: 1, radius: 8 },
      },
    })
    schema.push({
      type: 'text',
      text: this.props.variant === 'badge' ? String(fps) : `${fps} rFPS`,
      x: 8,
      y: 0,
      width: Math.max(0, this.props.width - 16),
      height: this.props.height,
      styles: {
        color: resolveNovaUiThemeValue(this.nova, 'var(--nova-fps-meter-color, #ffffff)'),
        font: { family: 'Inter, Arial, sans-serif', size: 11, weight: '900' },
        align: { horizontal: 'center', vertical: 'middle' },
      },
    })
    this.renderer.schema(schema)
  }

  protected override onMount(): void {
    super.onMount()
    this.nova.metrics.start()
    this.intervalId = setInterval(() => this.dirty({ render: true }), 250)
  }

  protected override onUnmount(): void {
    if (this.intervalId) clearInterval(this.intervalId)
    this.intervalId = undefined
    super.onUnmount()
  }

  protected override onPropsChanged(): void {
    this.props = normalizeFpsMeterProps(this.props)
    this.applyPlacement()
  }

  private applyPlacement(): void {
    const rect = resolveOverlayRect(this.surface.width, this.surface.height, this.props)
    this.options({
      ...(rect.x !== undefined && rect.y !== undefined ? { x: rect.x, y: rect.y } : {}),
      width: rect.width,
      height: rect.height,
      interactive: false,
      zIndex: this.props.zIndex,
    })
    this.setLocalRenderBounds({ x: 0, y: 0, width: rect.width, height: rect.height })
  }
}

function resolveOverlayRect(rootWidth: number, rootHeight: number, props: FpsMeterResolvedProps): { x?: number; y?: number; width: number; height: number } {
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
