import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { BadgeDescriptor } from '@/components/Badge/badge.config'
import type {
  BadgeApi,
  BadgeProps,
  BadgeResolvedProps,
  BadgeTone,
} from '@/components/Badge/badge.types'
import type { NovaUiOverlayRect } from '@/shared/overlay'
import {
  BADGE_NODE_DESCRIPTOR,

  normalizeBadgeProps,
} from '@/components/Badge/badge.config'
import {
  buildBoxSchema,
  finiteNumber,
  NovaUiComponentNode,
  pushIcon,
  pushText,
  resolveComponentTextStyle,
  sizeTokenPadding,
} from '@/shared/component'
import { createLayoutRect } from '@/shared/layout'

/**
 * Отображает компактный счетчик, статус или точечный индикатор поверх canvas UI.
 */
export class Badge<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<BadgeResolvedProps, BadgeApi, BadgeProps, E> {
  private readonly _api: BadgeApi
  private readonly _visualRect = createLayoutRect()

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
    this._api = {
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
    return this._api
  }

  /**
   * Обновляет визуальный rect для anchored badge.
   */
  update(): void {
    this._resolveVisualRect()
    this.setLocalRenderBounds(this._visualRect)
  }

  /**
   * Рисует бейдж.
   */
  render(): void {
    this._resolveVisualRect()
    const schema: NovaSchema = buildBoxSchema(this.props, this._visualRect.width, this._visualRect.height, { resolveThemeValue: value => this.resolveThemeValue(value) })

    if (!this.props.dot) {
      const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext, {}, value => this.resolveThemeValue(value))
      const padding = sizeTokenPadding(this.props.size)
      const iconSize = Math.max(10, padding.icon - 2)
      const text = this._displayText()
      const textX = this.props.icon ? padding.horizontal + iconSize + padding.gap : 0
      const textWidth = this.props.icon ? Math.max(0, this._visualRect.width - textX - padding.horizontal) : this._visualRect.width

      pushIcon(schema, this.props.icon, padding.horizontal, (this._visualRect.height - iconSize) / 2, iconSize)
      pushText(schema, text, textX, 0, textWidth, this._visualRect.height, textStyle, { align: 'center' })
    }

    if (this._visualRect.x || this._visualRect.y) {
      for (const item of schema) {
        const shape = item as Record<string, any>
        shape.x = (shape.x ?? 0) + this._visualRect.x
        shape.y = (shape.y ?? 0) + this._visualRect.y
      }
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
  private _displayText(): string {
    if (this.props.text) {
      return this.props.text
    }
    if (typeof this.props.value === 'number') {
      return this.props.value > this.props.max ? `${this.props.max}+` : String(this.props.value)
    }
    return this.props.value === undefined ? '' : String(this.props.value)
  }

  /**
   * Возвращает visual rect badge внутри layout rect.
   */
  private _resolveVisualRect(): void {
    const width = this.props.anchor ? this.props.width : this.width
    const height = this.props.anchor ? this.props.height : this.height
    const anchor = this._resolveAnchor()
    const placement = this.props.placement
    const side = placement === 'center' ? 'center' : placement.split('-')[0]
    const align = placement === 'center' ? 'center' : placement.split('-')[1] ?? 'center'

    let x = 0
    let y = 0

    if (side === 'center') {
      x = anchor.x + (anchor.width - width) / 2
      y = anchor.y + (anchor.height - height) / 2
    }
    else if (side === 'top' || side === 'bottom') {
      x = this._resolveHorizontalAnchor(anchor, width, align as BadgeResolvedProps['placement'])
      y = side === 'top' ? anchor.y : anchor.y + anchor.height - height
    }
    else {
      x = side === 'left' ? anchor.x : anchor.x + anchor.width - width
      y = this._resolveVerticalAnchor(anchor, height, align as BadgeResolvedProps['placement'])
    }

    this._visualRect.x = x + this.props.offsetX
    this._visualRect.y = y + this.props.offsetY
    this._visualRect.width = Math.max(0, width)
    this._visualRect.height = Math.max(0, height)
  }

  private _resolveAnchor(): NovaUiOverlayRect {
    const anchor = this.props.anchor
    if (!anchor || anchor.kind === 'root') {
      return { x: 0, y: 0, width: this.width, height: this.height }
    }
    if (anchor.kind === 'pointer') {
      return { x: finiteNumber(anchor.x, 0), y: finiteNumber(anchor.y, 0), width: 0, height: 0 }
    }
    return {
      x: finiteNumber(anchor.x, 0),
      y: finiteNumber(anchor.y, 0),
      width: finiteNumber(anchor.width, 0),
      height: finiteNumber(anchor.height, 0),
    }
  }

  private _resolveHorizontalAnchor(anchor: NovaUiOverlayRect, width: number, align: string): number {
    if (align === 'start') {
      return anchor.x
    }
    if (align === 'end') {
      return anchor.x + anchor.width - width
    }
    return anchor.x + (anchor.width - width) / 2
  }

  private _resolveVerticalAnchor(anchor: NovaUiOverlayRect, height: number, align: string): number {
    if (align === 'start') {
      return anchor.y
    }
    if (align === 'end') {
      return anchor.y + anchor.height - height
    }
    return anchor.y + (anchor.height - height) / 2
  }
}

export type { BadgeTone }
