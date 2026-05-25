import type { EventList } from '@endge/utils'
import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import {
  BUTTON_NODE_DESCRIPTOR,
  normalizeButtonProps,
  type ButtonDescriptor,
} from '@/components/Button/button.config'
import type {
  ButtonApi,
  ButtonProps,
  ButtonResolvedProps,
} from '@/components/Button/button.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  resolveComponentTextStyle,
  resolveInteractionBackground,
} from '@/shared/component/component-props'
import {
  pushIcon,
  pushText,
  sizeTokenPadding,
} from '@/shared/component/component-render'
import { findNovaUiRoot } from '@/components/Root/root-target'

/**
 * Описывает ответственность Button в архитектуре проекта.
 */
export class Button<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ButtonResolvedProps, ButtonApi, ButtonProps, E> {
  private hovered = false
  private pressed = false
  private readonly api: ButtonApi

  /**
   * Создает экземпляр Button и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ButtonProps = {},
    options: { componentId?: string } = {},
    descriptor: ButtonDescriptor = BUTTON_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeButtonProps(props), options)
    this.api = {
      press: event => this.press(event),
      setProps: patch => this.setProps(patch),
      setDisabled: disabled => this.setProps({ disabled }),
      setSelected: selected => this.setProps({ selected }),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setupEvents()
  }

  /**
   * Обновляет значение состояния Button.
   */
  override setProps(patch: ButtonProps): this {
    return super.setProps(patch as Partial<ButtonResolvedProps>)
  }

  /**
   * Возвращает значение состояния Button.
   */
  override getApi(): ButtonApi {
    return this.api
  }

  /**
   * Выполняет действие press в рамках ответственности Button.
   */
  press(event?: Event): void {
    if (this.props.disabled || this.props.loading) {
      this.playUiSound('disabledPress')
      return
    }
    this.playUiSound('press')
    findNovaUiRoot(this)?.getApi().closeTooltip({ suppressMs: 250 })
    this.props.onPress?.(event)
  }

  /**
   * Выполняет отрисовку Button.
   */
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
    const iconSize = padding.icon
    const hasIcon = !!this.props.icon
    const hasText = !!this.props.text && this.props.iconPlacement !== 'only'
    const contentWidth = Math.max(0, this.width - padding.horizontal * 2)
    const contentHeight = Math.max(0, this.height - padding.vertical * 2)
    const iconOpacity = this.props.loading ? 0.45 : 1

    if (this.props.iconPlacement === 'only') {
      pushIcon(schema, this.props.icon, (this.width - iconSize) / 2, (this.height - iconSize) / 2, iconSize, iconOpacity)
    } else if (this.props.iconPlacement === 'right') {
      const iconX = this.width - padding.horizontal - iconSize
      pushText(schema, this.props.text, padding.horizontal, padding.vertical, Math.max(0, contentWidth - (hasIcon ? iconSize + padding.gap : 0)), contentHeight, textStyle, { align: 'center' })
      pushIcon(schema, this.props.icon, iconX, (this.height - iconSize) / 2, iconSize, iconOpacity)
    } else if (this.props.iconPlacement === 'top' || this.props.iconPlacement === 'bottom') {
      const iconY = this.props.iconPlacement === 'top' ? padding.vertical : this.height - padding.vertical - iconSize
      const textY = this.props.iconPlacement === 'top' ? iconY + iconSize + padding.gap : padding.vertical
      pushIcon(schema, this.props.icon, (this.width - iconSize) / 2, iconY, iconSize, iconOpacity)
      pushText(schema, this.props.text, padding.horizontal, textY, contentWidth, Math.max(0, contentHeight - (hasIcon ? iconSize + padding.gap : 0)), textStyle, { align: 'center' })
    } else {
      const iconX = padding.horizontal
      const textX = hasIcon ? iconX + iconSize + padding.gap : padding.horizontal
      pushIcon(schema, this.props.icon, iconX, (this.height - iconSize) / 2, iconSize, iconOpacity)
      pushText(schema, this.props.text, textX, padding.vertical, Math.max(0, contentWidth - (hasIcon ? iconSize + padding.gap : 0)), contentHeight, textStyle, { align: hasText ? 'center' : 'left' })
    }

    this.renderer.schema(schema)
  }

  /**
   * Обрабатывает входящее событие Button.
   */
  protected override onPropsChanged(changedKeys: Array<keyof ButtonResolvedProps>): void {
    this.props = normalizeButtonProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  /**
   * Обновляет значение состояния Button.
   */
  private setupEvents(): void {
    this.on('mouseenter', () => {
      if (this.props.disabled) return
      this.hovered = true
      this.playUiSound('hover')
      this.dirty({ render: true })
    })
    this.on('mouseleave', () => {
      this.hovered = false
      this.pressed = false
      this.dirty({ render: true })
    })
    this.on('mousedown', event => {
      if (this.props.disabled || this.props.loading) {
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
      this.press(event)
      this.dirty({ render: true })
      return false
    })
    this.on('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      this.press(event)
    })
  }
}
