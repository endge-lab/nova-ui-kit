import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  SEGMENTED_CONTROL_NODE_DESCRIPTOR,
  normalizeSegmentedControlProps,
  type SegmentedControlDescriptor,
} from '@/components/SegmentedControl/SegmentedControl.config'
import type {
  SegmentedControlApi,
  SegmentedControlProps,
  SegmentedControlResolvedProps,
} from '@/components/SegmentedControl/SegmentedControl.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  resolveComponentTextStyle,
} from '@/shared/component'
import { pushIcon, pushText, sizeTokenPadding } from '@/shared/component'

export class SegmentedControl<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<SegmentedControlResolvedProps, SegmentedControlApi, SegmentedControlProps, E> {
  private hoveredIndex = -1
  private pressedIndex = -1
  private readonly api: SegmentedControlApi

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: SegmentedControlProps = {},
    options: { componentId?: string } = {},
    descriptor: SegmentedControlDescriptor = SEGMENTED_CONTROL_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeSegmentedControlProps(props), options)
    this.api = {
      setValue: (value, event) => this.setValue(value, event),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setupEvents()
  }

  override setProps(patch: SegmentedControlProps): this {
    return super.setProps(patch as Partial<SegmentedControlResolvedProps>)
  }

  override getApi(): SegmentedControlApi {
    return this.api
  }

  setValue(value: string, event?: Event): void {
    if (this.props.disabled) return
    const item = this.props.items.find(candidate => candidate.value === value)
    if (!item || item.disabled || value === this.props.value) return
    this.setProps({ value })
    this.props.onChange?.(value, event)
  }

  render(): void {
    const schema: NovaSchema = buildBoxSchema(this.props, this.width, this.height)
    const count = Math.max(1, this.props.items.length)
    const segmentWidth = this.width / count
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
    const padding = sizeTokenPadding(this.props.size)

    this.props.items.forEach((item, index) => {
      const x = index * segmentWidth
      const active = item.value === this.props.value
      const hovered = index === this.hoveredIndex
      const pressed = index === this.pressedIndex
      const background = active
        ? this.props.activeBackground ?? '#ffffff'
        : pressed
          ? this.props.pressedBackground ?? 'rgba(148,163,184,0.22)'
          : hovered
            ? this.props.hoverBackground ?? 'rgba(148,163,184,0.14)'
            : undefined

      if (background) {
        schema.push({
          type: 'rect',
          x: x + 3,
          y: 3,
          width: Math.max(0, segmentWidth - 6),
          height: Math.max(0, this.height - 6),
          styles: {
            background,
            border: { color: active ? 'rgba(15,23,42,0.12)' : 'rgba(0,0,0,0)', width: 1, radius: 6 },
          },
        })
      }
      const iconSize = padding.icon
      const iconX = x + padding.horizontal
      const textX = item.icon ? iconX + iconSize + padding.gap : x + padding.horizontal
      pushIcon(schema, item.icon, iconX, (this.height - iconSize) / 2, iconSize, item.disabled ? 0.35 : 1)
      pushText(schema, item.label, textX, 0, Math.max(0, segmentWidth - (textX - x) - padding.horizontal), this.height, {
        ...textStyle,
        color: item.disabled ? '#94a3b8' : active ? this.props.accentColor ?? textStyle.color : textStyle.color,
      }, { align: 'center' })
    })

    this.renderer.schema(schema)
  }

  protected override onPropsChanged(changedKeys: (keyof SegmentedControlResolvedProps)[]): void {
    this.props = normalizeSegmentedControlProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  private setupEvents(): void {
    this.on('mousemove', event => {
      if (this.props.disabled) return
      this.hoveredIndex = this.indexFromEvent(event)
      this.nova.cursor(this.hoveredIndex >= 0 ? 'pointer' : 'default')
      this.dirty({ render: true })
    })
    this.on('mouseleave', () => {
      this.hoveredIndex = -1
      this.pressedIndex = -1
      this.nova.cursor('default')
      this.dirty({ render: true })
    })
    this.on('mousedown', event => {
      if (this.props.disabled) return false
      this.focus(event)
      this.pressedIndex = this.indexFromEvent(event)
      this.dirty({ render: true })
      return false
    })
    this.on('mouseup', event => {
      const index = this.pressedIndex
      this.pressedIndex = -1
      const value = this.props.items[index]?.value
      if (index >= 0 && value !== undefined) this.setValue(value, event)
      this.dirty({ render: true })
      return false
    })
  }

  private indexFromEvent(event: MouseEvent): number {
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    if (localY < 0 || localY > this.height || localX < 0 || localX > this.width || this.props.items.length === 0) return -1
    const index = Math.min(this.props.items.length - 1, Math.floor(localX / Math.max(1, this.width / this.props.items.length)))
    return this.props.items[index]?.disabled ? -1 : index
  }
}
