import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  SLIDER_NODE_DESCRIPTOR,
  normalizeSliderProps,
  type SliderDescriptor,
} from '@/components/Slider/slider.config'
import type { SliderApi, SliderProps, SliderResolvedProps } from '@/components/Slider/slider.types'
import {
  NovaUiComponentNode,
  clamp,
} from '@/shared/component'

/**
 * Описывает ответственность Slider в архитектуре проекта.
 */
export class Slider<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<SliderResolvedProps, SliderApi, SliderProps, E> {
  private dragging = false
  private readonly api: SliderApi

  /**
   * Создает экземпляр Slider и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: SliderProps = {},
    options: { componentId?: string } = {},
    descriptor: SliderDescriptor = SLIDER_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeSliderProps(props), options)
    this.api = {
      setValue: (value, event) => this.setValue(value, event),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setupEvents()
  }

  /**
   * Обновляет значение состояния Slider.
   */
  override setProps(patch: SliderProps): this {
    return super.setProps(patch as Partial<SliderResolvedProps>)
  }

  /**
   * Возвращает значение состояния Slider.
   */
  override getApi(): SliderApi {
    return this.api
  }

  /**
   * Обновляет значение состояния Slider.
   */
  setValue(value: number, event?: Event): void {
    if (this.props.disabled) {
      this.playUiSound('disabledPress')
      return
    }
    const next = normalizeSliderProps({ ...this.props, value }).value
    if (next === this.props.value) return
    this.setProps({ value: next })
    this.playUiSound('change')
    this.props.onChange?.(next, event)
    this.props.onValueChange?.(next, event)
  }

  /**
   * Выполняет отрисовку Slider.
   */
  render(): void {
    const schema: NovaSchema = []
    const horizontal = this.props.orientation === 'horizontal'
    const trackLength = Math.max(1, horizontal ? this.width - 20 : this.height - 20)
    const percent = this.valuePercent()
    const trackThickness = 4
    const thumbRadius = this.dragging ? 8 : 7
    const trackX = horizontal ? 10 : (this.width - trackThickness) / 2
    const trackY = horizontal ? (this.height - trackThickness) / 2 : 10
    const fillLength = trackLength * percent

    schema.push({
      type: 'rect',
      x: trackX,
      y: trackY,
      width: horizontal ? trackLength : trackThickness,
      height: horizontal ? trackThickness : trackLength,
      styles: { background: this.resolveThemeValue(this.props.trackColor ?? '#dbe4ef'), border: { radius: 999, width: 0 } },
    })
    schema.push({
      type: 'rect',
      x: horizontal ? trackX : trackX,
      y: horizontal ? trackY : trackY + trackLength - fillLength,
      width: horizontal ? fillLength : trackThickness,
      height: horizontal ? trackThickness : fillLength,
      styles: { background: this.resolveThemeValue(this.props.accentColor ?? '#2563eb'), border: { radius: 999, width: 0 } },
    })

    for (const mark of this.props.marks) {
      const markPercent = this.percentForValue(mark.value)
      schema.push({
        type: 'circle',
        x: horizontal ? trackX + trackLength * markPercent : this.width / 2,
        y: horizontal ? this.height / 2 : trackY + trackLength * (1 - markPercent),
        radius: 2,
        styles: { background: this.resolveThemeValue(this.props.accentColor ?? '#2563eb'), opacity: 0.55 },
      })
    }

    schema.push({
      type: 'circle',
      x: horizontal ? trackX + fillLength : this.width / 2,
      y: horizontal ? this.height / 2 : trackY + trackLength - fillLength,
      radius: thumbRadius,
      styles: {
        background: this.resolveThemeValue(this.props.thumbColor ?? '#ffffff'),
        border: { color: this.resolveThemeValue(this.props.accentColor ?? '#2563eb'), width: 2 },
        opacity: this.props.disabled ? this.props.disabledOpacity : 1,
      },
    })
    this.renderer.schema(schema)
  }

  /**
   * Обрабатывает входящее событие Slider.
   */
  protected override onPropsChanged(changedKeys: Array<keyof SliderResolvedProps>): void {
    this.props = normalizeSliderProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  /**
   * Обновляет значение состояния Slider.
   */
  private setupEvents(): void {
    this.on('mouseenter', () => {
      if (this.props.disabled) return
      this.playUiSound('hover')
    })
    this.on('mousedown', event => {
      if (this.props.disabled) {
        this.playUiSound('disabledPress')
        return false
      }
      this.focus(event)
      this.dragging = true
      const next = this.valueFromEvent(event)
      this.props.onDragStart?.(this.props.value, event)
      this.props.onInput?.(next, event)
      this.setValue(next, event)
      this.dirty({ render: true })
      return false
    })
    this.on('dragmove', event => {
      if (!this.dragging) return false
      const next = this.valueFromEvent(event)
      this.props.onInput?.(next, event)
      this.setValue(next, event)
      return false
    })
    this.on('dragend', event => {
      if (!this.dragging) return false
      this.dragging = false
      const next = this.valueFromEvent(event)
      this.props.onInput?.(next, event)
      this.setValue(next, event)
      this.props.onDragEnd?.(this.props.value, event)
      this.dirty({ render: true })
      return false
    })
    this.on('keydown', event => {
      const delta = event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? this.props.step
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? -this.props.step
          : 0
      if (delta !== 0) this.setValue(this.props.value + delta, event)
    })
  }

  /**
   * Выполняет внутренний шаг valueFromEvent для Slider.
   */
  private valueFromEvent(event: MouseEvent): number {
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    const horizontal = this.props.orientation === 'horizontal'
    const trackLength = Math.max(1, horizontal ? this.width - 20 : this.height - 20)
    const rawPercent = horizontal
      ? (localX - 10) / trackLength
      : 1 - ((localY - 10) / trackLength)
    const percent = clamp(rawPercent, 0, 1)
    return this.props.min + (this.props.max - this.props.min) * percent
  }

  /**
   * Выполняет внутренний шаг valuePercent для Slider.
   */
  private valuePercent(): number {
    return this.percentForValue(this.props.value)
  }

  /**
   * Выполняет внутренний шаг percentForValue для Slider.
   */
  private percentForValue(value: number): number {
    if (this.props.max === this.props.min) return 0
    return clamp((value - this.props.min) / (this.props.max - this.props.min), 0, 1)
  }
}
