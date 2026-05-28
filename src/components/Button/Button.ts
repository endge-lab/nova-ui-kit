import type { EventList } from '@endge/utils'
import type { NovaApp, NovaSurface } from '@endge/nova'
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
} from '@/shared/component/component-props'
import { findNovaUiRoot } from '@/components/Root/root-target'
import { buildButtonSchema } from '@/components/Button/button-render'

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
    this.renderer.schema(buildButtonSchema(this.props, this.width, this.height, this.inheritedStyleContext, {
      hovered: this.hovered,
      pressed: this.pressed,
      active: this.props.selected,
    }, value => this.resolveThemeValue(value)))
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
