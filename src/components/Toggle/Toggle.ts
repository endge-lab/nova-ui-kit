import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  TOGGLE_NODE_DESCRIPTOR,
  normalizeToggleProps,
  type ToggleDescriptor,
} from '@/components/Toggle/toggle.config'
import type { ToggleApi, ToggleProps, ToggleResolvedProps } from '@/components/Toggle/toggle.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  resolveComponentTextStyle,
 pushText } from '@/shared/component'

export class Toggle<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ToggleResolvedProps, ToggleApi, ToggleProps, E> {
  private pressed = false
  private readonly api: ToggleApi

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ToggleProps = {},
    options: { componentId?: string } = {},
    descriptor: ToggleDescriptor = TOGGLE_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeToggleProps(props), options)
    this.api = {
      setChecked: checked => this.setProps({ checked }),
      toggle: event => this.toggle(event),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setupEvents()
  }

  override setProps(patch: ToggleProps): this {
    return super.setProps(patch as Partial<ToggleResolvedProps>)
  }

  override getApi(): ToggleApi {
    return this.api
  }

  toggle(event?: Event): void {
    if (this.props.disabled) {
      this.playUiSound('disabledPress')
      return
    }
    const checked = !this.props.checked
    this.setProps({ checked })
    this.playUiSound('change')
    this.props.onChange?.(checked, event)
  }

  render(): void {
    const schema: NovaSchema = []
    const trackWidth = 42
    const trackHeight = 24
    const trackY = (this.height - trackHeight) / 2
    const thumbSize = 18
    const thumbX = this.props.checked ? trackWidth - thumbSize - 3 : 3
    const trackProps = {
      ...this.props,
      width: trackWidth,
      height: trackHeight,
      background: this.props.checked ? this.props.accentColor : this.props.trackColor,
      border: { color: this.props.checked ? this.props.accentColor : '#cbd5e1', width: 1, radius: 999 },
    }
    const trackSchema = buildBoxSchema(trackProps, trackWidth, trackHeight)
    for (const item of trackSchema) {
      Object.assign(item, { x: 0, y: trackY })
      schema.push(item)
    }
    schema.push({
      type: 'circle',
      x: thumbX + thumbSize / 2,
      y: trackY + trackHeight / 2,
      radius: thumbSize / 2,
      styles: {
        background: this.props.thumbColor ?? '#ffffff',
        opacity: this.pressed ? 0.86 : 1,
        border: { color: 'rgba(15,23,42,0.12)', width: 1 },
      },
    })
    pushText(schema, this.props.label, trackWidth + 10, 0, Math.max(0, this.width - trackWidth - 10), this.height, resolveComponentTextStyle(this.props, this.inheritedStyleContext))
    this.renderer.schema(schema)
  }

  protected override onPropsChanged(changedKeys: Array<keyof ToggleResolvedProps>): void {
    this.props = normalizeToggleProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  private setupEvents(): void {
    this.on('mouseenter', () => {
      if (this.props.disabled) return
      this.playUiSound('hover')
    })
    this.on('mouseleave', () => {
      this.pressed = false
      this.dirty({ render: true })
    })
    this.on('mousedown', event => {
      if (this.props.disabled) {
        this.playUiSound('disabledPress')
        return false
      }
      this.focus(event)
      this.pressed = true
      this.dirty({ render: true })
      return false
    })
    this.on('mouseup', event => {
      if (!this.pressed) return false
      this.pressed = false
      this.toggle(event)
      this.dirty({ render: true })
      return false
    })
    this.on('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') this.toggle(event)
    })
  }
}
