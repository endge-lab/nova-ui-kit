import type { EventList } from '@endge/utils'
import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import { CHIP_NODE_DESCRIPTOR, normalizeChipProps, type ChipDescriptor } from '@/components/Chip/chip.config'
import type { ChipApi, ChipProps, ChipResolvedProps } from '@/components/Chip/chip.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  pushIcon,
  pushText,
  resolveComponentTextStyle,
  resolveInteractionBackground,
  sizeTokenPadding,
} from '@/shared/component'

export class Chip<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ChipResolvedProps, ChipApi, ChipProps, E> {
  private hovered = false
  private pressed = false
  private readonly api: ChipApi

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ChipProps = {},
    options: { componentId?: string } = {},
    descriptor: ChipDescriptor = CHIP_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeChipProps(props), options)
    this.api = {
      press: event => this.press(event),
      remove: event => this.remove(event),
      setProps: patch => this.setProps(patch),
      setSelected: selected => this.setProps({ selected }),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setupEvents()
  }

  override setProps(patch: ChipProps): this {
    return super.setProps(patch as Partial<ChipResolvedProps>)
  }

  override getApi(): ChipApi {
    return this.api
  }

  press(event?: Event): void {
    if (!this.props.disabled) this.props.onPress?.(event)
  }

  remove(event?: Event): void {
    if (!this.props.disabled && this.props.removable) this.props.onRemove?.(event)
  }

  render(): void {
    const schema: NovaSchema = buildBoxSchema(this.props, this.width, this.height, {
      background: resolveInteractionBackground(this.props, {
        hovered: this.hovered,
        pressed: this.pressed,
        active: this.props.selected,
      }),
    })
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
    const padding = sizeTokenPadding(this.props.size)
    let x = padding.horizontal

    if (this.props.avatar || this.props.icon) {
      pushIcon(schema, this.props.avatar ?? this.props.icon, x, (this.height - padding.icon) / 2, padding.icon)
      x += padding.icon + padding.gap
    }

    const removeWidth = this.props.removable ? padding.icon + padding.gap : 0
    pushText(schema, this.props.label, x, 0, Math.max(0, this.width - x - padding.horizontal - removeWidth), this.height, textStyle)
    if (this.props.removable) {
      pushText(schema, '×', this.width - padding.horizontal - padding.icon, 0, padding.icon, this.height, {
        ...textStyle,
        fontSize: 16,
        fontWeight: '700',
      }, { align: 'center' })
    }
    this.renderer.schema(schema)
  }

  protected override onPropsChanged(changedKeys: Array<keyof ChipResolvedProps>): void {
    this.props = normalizeChipProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  private setupEvents(): void {
    this.on('mouseenter', () => {
      this.hovered = true
      this.dirty({ render: true })
    })
    this.on('mouseleave', () => {
      this.hovered = false
      this.pressed = false
      this.dirty({ render: true })
    })
    this.on('mousedown', event => {
      this.focus(event)
      this.pressed = true
      this.dirty({ render: true })
      return false
    })
    this.on('mouseup', event => {
      this.pressed = false
      if (this.removeHit(event)) this.remove(event)
      else this.press(event)
      this.dirty({ render: true })
      return false
    })
    this.on('keydown', event => {
      if (event.key === 'Delete' || event.key === 'Backspace') this.remove(event)
      else if (event.key === 'Enter' || event.key === ' ') this.press(event)
    })
  }

  private removeHit(event: MouseEvent): boolean {
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    return this.props.removable && localY >= 0 && localY <= this.height && localX >= this.width - 32
  }
}
