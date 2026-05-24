import type { EventList } from '@endge/utils'
import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import {
  BADGE_NODE_DESCRIPTOR,
  normalizeBadgeProps,
  type BadgeDescriptor,
} from '@/components/Badge/badge.config'
import type {
  BadgeApi,
  BadgeProps,
  BadgeResolvedProps,
  BadgeTone,
} from '@/components/Badge/badge.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  resolveComponentTextStyle,
  pushIcon,
  pushText,
  sizeTokenPadding,
} from '@/shared/component'

/**
 * Отображает компактный счетчик, статус или точечный индикатор поверх canvas UI.
 */
export class Badge<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<BadgeResolvedProps, BadgeApi, BadgeProps, E> {
  private readonly api: BadgeApi

  /**
   * Создает экземпляр Badge и подготавливает публичный API.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: BadgeProps = {},
    options: { componentId?: string } = {},
    descriptor: BadgeDescriptor = BADGE_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeBadgeProps(props), options)
    this.api = {
      setText: text => this.setProps({ text }),
      setValue: value => this.setProps({ value }),
      setTone: tone => this.setProps({ tone }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
  }

  /**
   * Обновляет props Badge.
   */
  override setProps(patch: BadgeProps): this {
    return super.setProps(patch as Partial<BadgeResolvedProps>)
  }

  /**
   * Возвращает публичный API Badge.
   */
  override getApi(): BadgeApi {
    return this.api
  }

  /**
   * Рисует бейдж.
   */
  render(): void {
    const schema: NovaSchema = buildBoxSchema(this.props, this.width, this.height)

    if (!this.props.dot) {
      const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
      const padding = sizeTokenPadding(this.props.size)
      const iconSize = Math.max(10, padding.icon - 2)
      const text = this.displayText()
      const textX = this.props.icon ? padding.horizontal + iconSize + padding.gap : 0
      const textWidth = this.props.icon ? Math.max(0, this.width - textX - padding.horizontal) : this.width

      pushIcon(schema, this.props.icon, padding.horizontal, (this.height - iconSize) / 2, iconSize)
      pushText(schema, text, textX, 0, textWidth, this.height, textStyle, { align: 'center' })
    }

    this.renderer.schema(schema)
  }

  /**
   * Нормализует props после внешних изменений.
   */
  protected override onPropsChanged(changedKeys: Array<keyof BadgeResolvedProps>): void {
    this.props = normalizeBadgeProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
  }

  /**
   * Возвращает текстовое значение для бейджа.
   */
  private displayText(): string {
    if (this.props.text) return this.props.text
    if (typeof this.props.value === 'number') {
      return this.props.value > this.props.max ? `${this.props.max}+` : String(this.props.value)
    }
    return this.props.value === undefined ? '' : String(this.props.value)
  }
}

export type { BadgeTone }

