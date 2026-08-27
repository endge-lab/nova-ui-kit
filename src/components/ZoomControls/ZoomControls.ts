import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { ZoomControlsDescriptor } from '@/components/ZoomControls/zoom-controls.config'
import type {
  ZoomControlsApi,
  ZoomControlsProps,
  ZoomControlsResolvedProps,
} from '@/components/ZoomControls/zoom-controls.types'
import type { NovaUiEventPoint } from '@/shared/component/component-events'
import {
  normalizeZoomControlsProps,
  ZOOM_CONTROLS_NODE_DESCRIPTOR,

} from '@/components/ZoomControls/zoom-controls.config'
import { toLocalEventPoint } from '@/shared/component/component-events'
import {
  buildBoxSchema,
  clamp,
  NovaUiComponentNode,
  resolveComponentTextStyle,
} from '@/shared/component/component-props'
import { pushText } from '@/shared/component/component-render'

type ZoomControlsPart = 'minus' | 'plus' | null

/** Отрисовывает generic zoom controls для canvas-like продуктов. */
export class ZoomControls<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ZoomControlsResolvedProps, ZoomControlsApi, ZoomControlsProps, E> {
  private _hoveredPart: ZoomControlsPart = null
  private _pressedPart: ZoomControlsPart = null
  private readonly _eventPoint: NovaUiEventPoint = { x: 0, y: 0 }
  private readonly _api: ZoomControlsApi

  /** Создает zoom controls и связывает pointer events с изменением value. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ZoomControlsProps = {},
    options: { componentId?: string } = {},
    descriptor: ZoomControlsDescriptor = ZOOM_CONTROLS_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeZoomControlsProps(props), options)
    this._api = {
      zoomIn: () => this._zoomBy(1),
      zoomOut: () => this._zoomBy(-1),
      setValue: value => this._setZoomValue(value),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this._setupEvents()
  }

  /** Обновляет props с нормализацией zoom value. */
  override setProps(patch: ZoomControlsProps): this {
    return super.setProps(patch as Partial<ZoomControlsResolvedProps>)
  }

  /** Возвращает публичный API zoom controls. */
  override getApi(): ZoomControlsApi {
    return this._api
  }

  /** Отрисовывает сегменты zoom controls. */
  render(): void {
    const schema: NovaSchema = buildBoxSchema(this.props, this.width, this.height, { resolveThemeValue: value => this.resolveThemeValue(value) })
    const minus = this._minusRect()
    const plus = this._plusRect()
    const label = this._labelRect()
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext, { fontSize: 13, fontWeight: '700' }, value => this.resolveThemeValue(value))
    this._pushButtonSegment(schema, minus, this.props.minusLabel, this._segmentState('minus'))
    if (this.props.showValue && label.width > 0) {
      pushText(schema, this._formatValue(), label.x, label.y, label.width, label.height, {
        ...textStyle,
        color: this.resolveThemeValue(this.props.color ?? 'var(--nova-zoom-controls-value-color, #344054)') ?? textStyle.color,
        fontSize: 11,
        fontWeight: '700',
      }, { align: 'center' })
    }
    this._pushButtonSegment(schema, plus, this.props.plusLabel, this._segmentState('plus'))
    this.renderer.schema(schema)
  }

  /** Применяет common props и интерактивность. */
  protected override onPropsChanged(changedKeys: Array<keyof ZoomControlsResolvedProps>): void {
    this.props = normalizeZoomControlsProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  private _setupEvents(): void {
    this.on('mousemove', (event) => {
      if (this.props.disabled) {
        return
      }
      const next = this._resolvePart(event)
      if (next === this._hoveredPart) {
        return
      }
      this._hoveredPart = next
      this.dirty({ render: true })
    })
    this.on('mouseleave', () => {
      this._hoveredPart = null
      this._pressedPart = null
      this.dirty({ render: true })
    })
    this.on('mousedown', (event) => {
      if (this.props.disabled) {
        return false
      }
      const part = this._resolvePart(event)
      if (!part) {
        return false
      }
      this.focus(event)
      this._pressedPart = part
      this._zoomBy(part === 'plus' ? 1 : -1)
      this.dirty({ render: true })
      return false
    })
    this.on('mouseup', () => {
      this._pressedPart = null
      this.dirty({ render: true })
      return false
    })
  }

  private _zoomBy(direction: -1 | 1): void {
    this._setZoomValue(this.props.value + this.props.step * direction)
  }

  private _setZoomValue(value: number): void {
    const next = clamp(value, this.props.minZoom, this.props.maxZoom)
    if (next === this.props.value) {
      return
    }
    this.setProps({ value: next })
    this.props.onChange?.(next)
  }

  private _resolvePart(event: MouseEvent): ZoomControlsPart {
    const point = toLocalEventPoint(this, event, this._eventPoint)
    if (point.y < 0 || point.y > this.height) {
      return null
    }
    if (point.x >= this._minusRect().x && point.x <= this._minusRect().x + this._minusRect().width) {
      return 'minus'
    }
    if (point.x >= this._plusRect().x && point.x <= this._plusRect().x + this._plusRect().width) {
      return 'plus'
    }
    return null
  }

  private _minusRect(): { x: number, y: number, width: number, height: number } {
    return { x: 0, y: 0, width: 36, height: this.height }
  }

  private _labelRect(): { x: number, y: number, width: number, height: number } {
    return { x: 36, y: 0, width: this.props.showValue ? Math.max(0, this.width - 72) : 0, height: this.height }
  }

  private _plusRect(): { x: number, y: number, width: number, height: number } {
    return { x: this.width - 36, y: 0, width: 36, height: this.height }
  }

  private _segmentState(part: Exclude<ZoomControlsPart, null>): 'pressed' | 'hovered' | 'default' {
    if (this._pressedPart === part) {
      return 'pressed'
    }
    if (this._hoveredPart === part) {
      return 'hovered'
    }
    return 'default'
  }

  private _pushButtonSegment(
    schema: NovaSchema,
    rect: { x: number, y: number, width: number, height: number },
    label: string,
    state: 'pressed' | 'hovered' | 'default',
  ): void {
    const background = state === 'pressed'
      ? this.props.pressedBackground
      : state === 'hovered'
        ? this.props.hoverBackground
        : undefined
    if (background) {
      schema.push({ type: 'rect', ...rect, styles: { background: this.resolveThemeValue(background) } })
    }
    pushText(schema, label, rect.x, rect.y, rect.width, rect.height, {
      ...resolveComponentTextStyle(this.props, this.inheritedStyleContext, { fontSize: 15, fontWeight: '900' }, value => this.resolveThemeValue(value)),
      fontSize: 15,
      fontWeight: '900',
    }, { align: 'center' })
  }

  private _formatValue(): string {
    return this.props.formatValue?.(this.props.value) ?? `${Math.round(this.props.value * 100)}%`
  }
}
