import { NovaComponentNode, type NovaApp, type NovaSchema, type NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  FPS_METER_NODE_DESCRIPTOR,
  normalizeFpsMeterProps,
  type FpsMeterDescriptor,
} from '@/components/FpsMeter/fps-meter.config'
import type {
  FpsMeterApi,
  FpsMeterProps,
  FpsMeterResolvedProps,
} from '@/components/FpsMeter/fps-meter.types'

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
    super(app, surface, descriptor, normalizeFpsMeterProps(props), options)
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

    const fps = Math.max(0, Math.min(999, Math.round(this.nova.debugger.displayFps || this.nova.debugger.lastFps || 0)))
    const schema: NovaSchema = []
    const minimal = this.props.variant === 'minimal'
    schema.push({
      type: 'rect',
      x: 0,
      y: 0,
      width: this.props.width,
      height: this.props.height,
      styles: {
        background: minimal ? 'rgba(17,24,39,0.66)' : 'rgba(17,24,39,0.82)',
        border: { color: 'rgba(255,255,255,0.14)', width: 1, radius: 7 },
      },
    })
    schema.push({
      type: 'text',
      text: this.props.variant === 'badge' ? String(fps) : `${fps} FPS`,
      x: 8,
      y: 0,
      width: Math.max(0, this.props.width - 16),
      height: this.props.height,
      styles: {
        color: '#ffffff',
        font: { family: 'Inter, Arial, sans-serif', size: 10, weight: '900' },
        align: { horizontal: 'center', vertical: 'middle' },
      },
    })
    this.renderer.schema(schema)
  }

  protected override onMount(): void {
    super.onMount()
    this.nova.debugger.startDisplayMonitor()
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
    this.options({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, interactive: false, zIndex: 2000 })
    this.setLocalRenderBounds({ x: 0, y: 0, width: rect.width, height: rect.height })
  }
}

function resolveOverlayRect(rootWidth: number, rootHeight: number, props: FpsMeterResolvedProps): { x: number; y: number; width: number; height: number } {
  const width = props.width
  const height = props.height
  if (typeof props.x === 'number' && typeof props.y === 'number') return { x: props.x, y: props.y, width, height }
  const left = props.placement.endsWith('left')
  const top = props.placement.startsWith('top')
  return {
    x: left ? props.margin : Math.max(0, rootWidth - props.margin - width),
    y: top ? props.margin : Math.max(0, rootHeight - props.margin - height),
    width,
    height,
  }
}
