import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { CheckboxDescriptor } from '@/components/Checkbox/checkbox.config'
import type { CheckboxApi, CheckboxProps, CheckboxResolvedProps } from '@/components/Checkbox/checkbox.types'
import {
  CHECKBOX_NODE_DESCRIPTOR,

  normalizeCheckboxProps,
} from '@/components/Checkbox/checkbox.config'
import {
  buildBoxSchema,
  NovaUiComponentNode,
  pushText,
  resolveComponentTextStyle,
  resolveInteractionBackground,
} from '@/shared/component'

/**
 * Описывает ответственность Checkbox в архитектуре проекта.
 */
export class Checkbox<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<CheckboxResolvedProps, CheckboxApi, CheckboxProps, E> {
  private _hovered = false
  private _pressed = false
  private readonly _api: CheckboxApi

  /**
   * Создает экземпляр Checkbox и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: CheckboxProps = {},
    options: { componentId?: string } = {},
    descriptor: CheckboxDescriptor = CHECKBOX_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeCheckboxProps(props), options)
    this._api = {
      setChecked: checked => this.setProps({ checked, indeterminate: false }),
      toggle: event => this.toggle(event),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this._setupEvents()
  }

  /**
   * Обновляет значение состояния Checkbox.
   */
  override setProps(patch: CheckboxProps): this {
    return super.setProps(patch as Partial<CheckboxResolvedProps>)
  }

  /**
   * Возвращает значение состояния Checkbox.
   */
  override getApi(): CheckboxApi {
    return this._api
  }

  /**
   * Переключает флаг состояния Checkbox.
   */
  toggle(event?: Event): void {
    if (this.props.disabled) {
      this.playUiSound('disabledPress')
      return
    }
    const checked = !this.props.checked
    this.setProps({ checked, indeterminate: false })
    this.playUiSound('change')
    this.props.onChange?.(checked, event)
    this.props.onValueChange?.(checked, event)
  }

  /**
   * Выполняет отрисовку Checkbox.
   */
  render(): void {
    const schema: NovaSchema = []
    const boxSize = Math.min(18, Math.max(14, this.height - 8))
    const boxY = (this.height - boxSize) / 2
    const active = this.props.checked || this.props.indeterminate
    const boxProps = {
      ...this.props,
      background: active
        ? this.props.accentColor ?? 'var(--nova-ui-accent, #2563eb)'
        : resolveInteractionBackground(this.props, { hovered: this._hovered, pressed: this._pressed }, value => this.resolveThemeValue(value)),
      border: active
        ? { color: this.props.accentColor ?? 'var(--nova-ui-accent, #2563eb)', width: 1, radius: 4 }
        : this.props.border,
    }

    schema.push(...buildBoxSchema(boxProps, boxSize, boxSize, { resolveThemeValue: value => this.resolveThemeValue(value) }))
    if (schema[0]) {
      Object.assign(schema[0], { x: 0, y: boxY })
    }

    if (this.props.checked) {
      schema.push(
        { type: 'line', x1: 4, y1: boxY + boxSize / 2, x2: 7, y2: boxY + boxSize - 5, styles: { color: '#ffffff', width: 2 } },
        { type: 'line', x1: 7, y1: boxY + boxSize - 5, x2: boxSize - 4, y2: boxY + 5, styles: { color: '#ffffff', width: 2 } },
      )
    }
    else if (this.props.indeterminate) {
      schema.push({ type: 'line', x1: 4, y1: boxY + boxSize / 2, x2: boxSize - 4, y2: boxY + boxSize / 2, styles: { color: '#ffffff', width: 2 } })
    }

    pushText(schema, this.props.label, boxSize + 8, 0, Math.max(0, this.width - boxSize - 8), this.height, resolveComponentTextStyle(this.props, this.inheritedStyleContext, {}, value => this.resolveThemeValue(value)))
    this.renderer.schema(schema)
  }

  /**
   * Обрабатывает входящее событие Checkbox.
   */
  protected override onPropsChanged(changedKeys: Array<keyof CheckboxResolvedProps>): void {
    this.props = normalizeCheckboxProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  /**
   * Обновляет значение состояния Checkbox.
   */
  private _setupEvents(): void {
    this.on('mouseenter', () => {
      if (this.props.disabled) {
        return
      }
      this._hovered = true
      this.playUiSound('hover')
      this.dirty({ render: true })
    })
    this.on('mouseleave', () => {
      this._hovered = false
      this._pressed = false
      this.dirty({ render: true })
    })
    this.on('mousedown', (event) => {
      if (this.props.disabled) {
        this.playUiSound('disabledPress')
        return false
      }
      this.focus(event)
      this._pressed = true
      this.dirty({ render: true })
      return false
    })
    this.on('mouseup', (event) => {
      if (!this._pressed) {
        return false
      }
      this._pressed = false
      this.toggle(event)
      this.dirty({ render: true })
      return false
    })
    this.on('keydown', (event) => {
      if (event.key === ' ' || event.key === 'Enter') {
        this.toggle(event)
      }
    })
  }
}
