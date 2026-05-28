import type { EventList } from '@endge/utils'
import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import {
  ZOOM_CONTROLS_NODE_DESCRIPTOR,
  normalizeZoomControlsProps,
  type ZoomControlsDescriptor,
} from '@/components/ZoomControls/zoom-controls.config'
import type {
  ZoomControlsApi,
  ZoomControlsProps,
  ZoomControlsResolvedProps,
} from '@/components/ZoomControls/zoom-controls.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  clamp,
  resolveComponentTextStyle,
} from '@/shared/component/component-props'
import { pushText } from '@/shared/component/component-render'

type ZoomControlsPart = 'minus' | 'plus' | null

/** Отрисовывает generic zoom controls для canvas-like продуктов. */
export class ZoomControls<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ZoomControlsResolvedProps, ZoomControlsApi, ZoomControlsProps, E> {
  private hoveredPart: ZoomControlsPart = null
  private pressedPart: ZoomControlsPart = null
  private readonly api: ZoomControlsApi

  /** Создает zoom controls и связывает pointer events с изменением value. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ZoomControlsProps = {},
    options: { componentId?: string } = {},
    descriptor: ZoomControlsDescriptor = ZOOM_CONTROLS_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeZoomControlsProps(props), options)
    this.api = {
      zoomIn: () => this.zoomBy(1),
      zoomOut: () => this.zoomBy(-1),
      setValue: value => this.setZoomValue(value),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setupEvents()
  }

  /** Обновляет props с нормализацией zoom value. */
  override setProps(patch: ZoomControlsProps): this {
    return super.setProps(patch as Partial<ZoomControlsResolvedProps>)
  }

  /** Возвращает публичный API zoom controls. */
  override getApi(): ZoomControlsApi {
    return this.api
  }

  /** Отрисовывает сегменты zoom controls. */
  render(): void {
    const schema: NovaSchema = buildBoxSchema(this.props, this.width, this.height)
    const minus = this.minusRect()
    const plus = this.plusRect()
    const label = this.labelRect()
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext, { fontSize: 13, fontWeight: '700' })
    this.pushButtonSegment(schema, minus, this.props.minusLabel, this.segmentState('minus'))
    if (this.props.showValue && label.width > 0) {
      pushText(schema, this.formatValue(), label.x, label.y, label.width, label.height, {
        ...textStyle,
        color: this.props.color ?? 'var(--nova-zoom-controls-value-color, #344054)',
        fontSize: 11,
        fontWeight: '700',
      }, { align: 'center' })
    }
    this.pushButtonSegment(schema, plus, this.props.plusLabel, this.segmentState('plus'))
    this.renderer.schema(schema)
  }

  /** Применяет common props и интерактивность. */
  protected override onPropsChanged(changedKeys: Array<keyof ZoomControlsResolvedProps>): void {
    this.props = normalizeZoomControlsProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  private setupEvents(): void {
    this.on('mousemove', event => {
      if (this.props.disabled) return
      const next = this.resolvePart(event)
      if (next === this.hoveredPart) return
      this.hoveredPart = next
      this.dirty({ render: true })
    })
    this.on('mouseleave', () => {
      this.hoveredPart = null
      this.pressedPart = null
      this.dirty({ render: true })
    })
    this.on('mousedown', event => {
      if (this.props.disabled) return false
      const part = this.resolvePart(event)
      if (!part) return false
      this.focus(event)
      this.pressedPart = part
      this.dirty({ render: true })
      return false
    })
    this.on('mouseup', event => {
      const part = this.resolvePart(event)
      const pressed = this.pressedPart
      this.pressedPart = null
      if (!pressed || part !== pressed) {
        this.dirty({ render: true })
        return false
      }
      this.zoomBy(pressed === 'plus' ? 1 : -1)
      this.dirty({ render: true })
      return false
    })
  }

  private zoomBy(direction: -1 | 1): void {
    this.setZoomValue(this.props.value + this.props.step * direction)
  }

  private setZoomValue(value: number): void {
    const next = clamp(value, this.props.minZoom, this.props.maxZoom)
    if (next === this.props.value) return
    this.setProps({ value: next })
    this.props.onChange?.(next)
  }

  private resolvePart(event: MouseEvent): ZoomControlsPart {
    const x = event.offsetX
    if (x >= this.minusRect().x && x <= this.minusRect().x + this.minusRect().width) return 'minus'
    if (x >= this.plusRect().x && x <= this.plusRect().x + this.plusRect().width) return 'plus'
    return null
  }

  private minusRect(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: 36, height: this.height }
  }

  private labelRect(): { x: number; y: number; width: number; height: number } {
    return { x: 36, y: 0, width: this.props.showValue ? Math.max(0, this.width - 72) : 0, height: this.height }
  }

  private plusRect(): { x: number; y: number; width: number; height: number } {
    return { x: this.width - 36, y: 0, width: 36, height: this.height }
  }

  private segmentState(part: Exclude<ZoomControlsPart, null>): 'pressed' | 'hovered' | 'default' {
    if (this.pressedPart === part) return 'pressed'
    if (this.hoveredPart === part) return 'hovered'
    return 'default'
  }

  private pushButtonSegment(
    schema: NovaSchema,
    rect: { x: number; y: number; width: number; height: number },
    label: string,
    state: 'pressed' | 'hovered' | 'default',
  ): void {
    const background = state === 'pressed'
      ? this.props.pressedBackground
      : state === 'hovered'
        ? this.props.hoverBackground
        : undefined
    if (background) {
      schema.push({ type: 'rect', ...rect, styles: { background } })
    }
    pushText(schema, label, rect.x, rect.y, rect.width, rect.height, {
      ...resolveComponentTextStyle(this.props, this.inheritedStyleContext, { fontSize: 15, fontWeight: '900' }),
      fontSize: 15,
      fontWeight: '900',
    }, { align: 'center' })
  }

  private formatValue(): string {
    return this.props.formatValue?.(this.props.value) ?? `${Math.round(this.props.value * 100)}%`
  }
}
