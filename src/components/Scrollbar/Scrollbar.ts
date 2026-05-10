import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  SCROLLBAR_NODE_DESCRIPTOR,
  normalizeScrollbarProps,
  type ScrollbarDescriptor,
} from '@/components/Scrollbar/Scrollbar.config'
import type {
  ScrollbarApi,
  ScrollbarProps,
  ScrollbarResolvedProps,
  ScrollbarState,
} from '@/components/Scrollbar/Scrollbar.types'
import {
  NovaUiComponentNode,
  clamp,
} from '@/shared/component'

export class Scrollbar<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ScrollbarResolvedProps, ScrollbarApi, ScrollbarProps, E> {
  private dragging = false
  private hovered = false
  private readonly api: ScrollbarApi

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

  override setProps(patch: ScrollbarProps): this {
    return super.setProps(patch as Partial<ScrollbarResolvedProps>)
  }

  override getApi(): ScrollbarApi {
    return this.api
  }

  setValue(value: number, event?: Event): void {
    if (this.props.disabled) return
    const next = normalizeScrollbarProps({ ...this.props, value }).value
    if (next === this.props.value) return
    this.setProps({ value: next })
    this.props.onChange?.(next, event)
  }

  getScrollState(): ScrollbarState {
    return {
      value: this.props.value,
      max: this.maxValue(),
      viewportSize: this.props.viewportSize,
      contentSize: this.props.contentSize,
    }
  }

  render(): void {
    const schema: NovaSchema = []
    const horizontal = this.props.orientation === 'horizontal'
    const length = Math.max(1, horizontal ? this.width : this.height)
    const cross = Math.max(4, horizontal ? this.height : this.width)
    const max = this.maxValue()
    const thumbLength = Math.max(20, length * (this.props.viewportSize / Math.max(this.props.viewportSize, this.props.contentSize)))
    const travel = Math.max(0, length - thumbLength)
    const offset = max > 0 ? travel * (this.props.value / max) : 0
    const thumbColor = this.hovered || this.dragging
      ? this.props.hoverBackground ?? this.props.thumbColor
      : this.props.thumbColor

    schema.push({
      type: 'rect',
      x: horizontal ? 0 : (cross - this.props.thickness) / 2,
      y: horizontal ? (cross - this.props.thickness) / 2 : 0,
      width: horizontal ? length : this.props.thickness,
      height: horizontal ? this.props.thickness : length,
      styles: { background: this.props.trackColor ?? 'rgba(148,163,184,0.24)', border: { radius: 999, width: 0 } },
    })
    schema.push({
      type: 'rect',
      x: horizontal ? offset : (cross - this.props.thickness) / 2,
      y: horizontal ? (cross - this.props.thickness) / 2 : offset,
      width: horizontal ? thumbLength : this.props.thickness,
      height: horizontal ? this.props.thickness : thumbLength,
      styles: { background: thumbColor ?? 'rgba(71,85,105,0.72)', border: { radius: 999, width: 0 } },
    })
    this.renderer.schema(schema)
  }

  protected override onPropsChanged(changedKeys: (keyof ScrollbarResolvedProps)[]): void {
    this.props = normalizeScrollbarProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

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

  private valueFromEvent(event: MouseEvent): number {
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    const horizontal = this.props.orientation === 'horizontal'
    const length = Math.max(1, horizontal ? this.width : this.height)
    const thumbLength = Math.max(20, length * (this.props.viewportSize / Math.max(this.props.viewportSize, this.props.contentSize)))
    const travel = Math.max(1, length - thumbLength)
    const raw = horizontal ? localX - thumbLength / 2 : localY - thumbLength / 2
    return clamp(raw / travel, 0, 1) * this.maxValue()
  }

  private maxValue(): number {
    return Math.max(0, this.props.contentSize - this.props.viewportSize)
  }
}
