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
  type NovaUiLayoutConstraints,
  type NovaUiLayoutMeasure,
  NOVA_UI_LAYOUT_TARGET,
} from '@/shared/layout'
import type {
  FpsMeterApi,
  FpsMeterMetric,
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
  readonly [NOVA_UI_LAYOUT_TARGET] = true as const

  private readonly api: FpsMeterApi
  private intervalId: ReturnType<typeof setInterval> | undefined
  private externalLayout = false

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
      interactive: false,
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

    const reading = resolveFpsMeterReading(this.nova.metrics.snapshot(), this.props.metric)
    const schema: NovaSchema = []
    const minimal = this.props.variant === 'minimal'
    schema.push({
      type: 'rect',
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      styles: {
        background: resolveNovaUiThemeValue(this.nova, minimal ? 'var(--nova-fps-meter-minimal-background, rgba(17,24,39,0.66))' : 'var(--nova-fps-meter-background, rgba(17,24,39,0.82))'),
        border: { color: resolveNovaUiThemeValue(this.nova, 'var(--nova-fps-meter-border-color, rgba(255,255,255,0.14))'), width: 1, radius: 8 },
      },
    })
    schema.push({
      type: 'text',
      text: this.props.variant === 'badge' ? String(reading.value) : `${reading.value} ${reading.label}`,
      x: 8,
      y: 0,
      width: Math.max(0, this.width - 16),
      height: this.height,
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
    this.options({ interactive: false, zIndex: this.props.zIndex })
    if (!this.externalLayout) this.applyPlacement()
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
      interactive: false,
      zIndex: this.props.zIndex,
    })
    this.setLocalRenderBounds({ x: 0, y: 0, width: rect.width, height: rect.height })
    if (changed) this.dirty({ matrix: true, update: sizeChanged, render: true })
  }
}

export function resolveFpsMeterReading(
  snapshot: { fps?: number; rFps?: number },
  metric: FpsMeterMetric = 'raf',
): { value: number; label: 'FPS' } {
  const raw = metric === 'raf' ? snapshot.rFps : snapshot.fps
  return {
    value: Math.max(0, Math.min(999, Math.round(raw || 0))),
    label: 'FPS',
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
