import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  SCROLLBAR_NODE_DESCRIPTOR,
  normalizeScrollbarProps,
  type ScrollbarDescriptor,
} from '@/components/Scrollbar/scrollbar.config'
import type {
  ScrollbarApi,
  ScrollbarProps,
  ScrollbarResolvedProps,
  ScrollbarState,
} from '@/components/Scrollbar/scrollbar.types'
import {
  createNovaScrollbarGeometry,
  createNovaScrollbarSchema,
} from '@/components/Scrollbar/scrollbar-geometry'
import {
  NovaUiComponentNode,
  clamp,
} from '@/shared/component'

/**
 * Описывает ответственность Scrollbar в архитектуре проекта.
 */
export class Scrollbar<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ScrollbarResolvedProps, ScrollbarApi, ScrollbarProps, E> {
  private dragging = false
  private hovered = false
  private readonly api: ScrollbarApi

  /**
   * Создает экземпляр Scrollbar и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ScrollbarProps = {},
    options: { componentId?: string } = {},
    descriptor: ScrollbarDescriptor = SCROLLBAR_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeScrollbarProps(props), options)
    this.api = {
      setValue: (value, event) => this.setValue(value, event),
      getScrollState: () => this.getScrollState(),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setupEvents()
  }

  /**
   * Обновляет значение состояния Scrollbar.
   */
  override setProps(patch: ScrollbarProps): this {
    return super.setProps(patch as Partial<ScrollbarResolvedProps>)
  }

  /**
   * Возвращает значение состояния Scrollbar.
   */
  override getApi(): ScrollbarApi {
    return this.api
  }

  /**
   * Обновляет значение состояния Scrollbar.
   */
  setValue(value: number, event?: Event): void {
    if (this.props.disabled) return
    const next = normalizeScrollbarProps({ ...this.props, value }).value
    if (next === this.props.value) return
    this.setProps({ value: next })
    this.props.onChange?.(next, event)
  }

  /**
   * Возвращает значение состояния Scrollbar.
   */
  getScrollState(): ScrollbarState {
    return {
      value: this.props.value,
      max: this.maxValue(),
      viewportSize: this.props.viewportSize,
      contentSize: this.props.contentSize,
    }
  }

  /**
   * Выполняет отрисовку Scrollbar.
   */
  render(): void {
    const horizontal = this.props.orientation === 'horizontal'
    const length = Math.max(1, horizontal ? this.width : this.height)
    const cross = Math.max(4, horizontal ? this.height : this.width)
    const thickness = Math.min(cross, this.props.thickness)
    const geometry = createNovaScrollbarGeometry({
      axis: this.props.orientation,
      value: this.props.value,
      viewportSize: this.props.viewportSize,
      contentSize: this.props.contentSize,
      track: {
        x: horizontal ? 0 : (cross - thickness) / 2,
        y: horizontal ? (cross - thickness) / 2 : 0,
        width: horizontal ? length : thickness,
        height: horizontal ? thickness : length,
      },
      options: {
        thickness: this.props.thickness,
        minThumbSize: this.props.minThumbSize,
        radius: this.props.radius,
        trackColor: this.resolveThemeValue(this.props.trackColor) ?? undefined,
        thumbColor: this.resolveThemeValue(this.props.thumbColor) ?? undefined,
        thumbHoverColor: this.resolveThemeValue(this.props.hoverBackground ?? this.props.thumbColor) ?? undefined,
      },
    })
    const schema: NovaSchema = createNovaScrollbarSchema(geometry, {
      alpha: this.props.opacity,
      hoveredAxis: this.hovered ? this.props.orientation : null,
      draggingAxis: this.dragging ? this.props.orientation : null,
    })
    this.renderer.schema(schema)
  }

  /**
   * Обрабатывает входящее событие Scrollbar.
   */
  protected override onPropsChanged(changedKeys: Array<keyof ScrollbarResolvedProps>): void {
    this.props = normalizeScrollbarProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  /**
   * Обновляет значение состояния Scrollbar.
   */
  private setupEvents(): void {
    this.on('mouseenter', () => {
      if (this.props.disabled) return
      this.hovered = true
      this.dirty({ render: true })
    })
    this.on('mouseleave', () => {
      this.hovered = false
      this.dirty({ render: true })
    })
    this.on('mousedown', event => {
      if (this.props.disabled) return false
      this.dragging = true
      this.setValue(this.valueFromEvent(event), event)
      return false
    })
    this.on('dragmove', event => {
      if (!this.dragging) return false
      this.setValue(this.valueFromEvent(event), event)
      return false
    })
    this.on('dragend', event => {
      if (!this.dragging) return false
      this.dragging = false
      this.setValue(this.valueFromEvent(event), event)
      this.dirty({ render: true })
      return false
    })
  }

  /**
   * Выполняет внутренний шаг valueFromEvent для Scrollbar.
   */
  private valueFromEvent(event: MouseEvent): number {
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    const horizontal = this.props.orientation === 'horizontal'
    const length = Math.max(1, horizontal ? this.width : this.height)
    const thumbLength = Math.max(this.props.minThumbSize, length * (this.props.viewportSize / Math.max(this.props.viewportSize, this.props.contentSize)))
    const travel = Math.max(1, length - thumbLength)
    const raw = horizontal ? localX - thumbLength / 2 : localY - thumbLength / 2
    return clamp(raw / travel, 0, 1) * this.maxValue()
  }

  /**
   * Выполняет внутренний шаг maxValue для Scrollbar.
   */
  private maxValue(): number {
    return Math.max(0, this.props.contentSize - this.props.viewportSize)
  }
}
