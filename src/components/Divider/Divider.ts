import type { EventList } from '@endge/utils'
import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import {
  DIVIDER_NODE_DESCRIPTOR,
  normalizeDividerProps,
  type DividerDescriptor,
} from '@/components/Divider/divider.config'
import type {
  DividerApi,
  DividerProps,
  DividerResolvedProps,
} from '@/components/Divider/divider.types'
import {
  NovaUiComponentNode,
  finiteNumber,
  resolveComponentTextStyle,
} from '@/shared/component/component-props'
import { resolveSpacing } from '@/shared/layout'

/**
 * Рисует тонкий разделитель внутри Nova UI Kit layout.
 */
export class Divider<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<DividerResolvedProps, DividerApi, DividerProps, E> {
  private readonly api: DividerApi

  /**
   * Создает экземпляр Divider и подготавливает публичный API.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: DividerProps = {},
    options: { componentId?: string } = {},
    descriptor: DividerDescriptor = DIVIDER_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeDividerProps(props), options)
    this.api = {
      setOrientation: orientation => this.setProps({ orientation }),
      setLineStyle: lineStyle => this.setProps({ lineStyle }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
  }

  /**
   * Обновляет props Divider.
   */
  override setProps(patch: DividerProps): this {
    return super.setProps(patch as Partial<DividerResolvedProps>)
  }

  /**
   * Возвращает публичный API Divider.
   */
  override getApi(): DividerApi {
    return this.api
  }

  /**
   * Рисует разделитель.
   */
  render(): void {
    const schema: NovaSchema = []
    const margin = resolveSpacing(this.props.margin)
    const padding = resolveSpacing(this.props.padding)
    const contentX = margin.left + padding.left
    const contentY = margin.top + padding.top
    const contentWidth = Math.max(0, this.width - margin.left - margin.right - padding.left - padding.right)
    const contentHeight = Math.max(0, this.height - margin.top - margin.bottom - padding.top - padding.bottom)
    const thickness = this.resolveThickness()
    const color = this.props.border?.color ?? resolveComponentTextStyle(this.props, this.inheritedStyleContext, { color: '#cbd5e1' }).color
    const opacity = this.props.disabled ? this.props.disabledOpacity : this.props.opacity
    const dashPattern = this.resolveDashPattern(thickness)

    if (this.props.orientation === 'vertical') {
      this.pushVerticalLine(schema, contentX + contentWidth / 2, contentY, contentHeight, thickness, color, opacity, dashPattern)
    } else {
      this.pushHorizontalLine(schema, contentX, contentY + contentHeight / 2, contentWidth, thickness, color, opacity, dashPattern)
    }

    this.renderer.schema(schema)
  }

  /**
   * Нормализует props после внешних изменений.
   */
  protected override onPropsChanged(changedKeys: Array<keyof DividerResolvedProps>): void {
    this.props = normalizeDividerProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    this.dirty({ update: true, render: true })
  }

  private resolveThickness(): number {
    return Math.max(0, finiteNumber(this.props.thickness ?? this.props.border?.width, 1))
  }

  private resolveDashPattern(thickness: number): Array<number> | undefined {
    if (this.props.dashPattern?.length) return this.props.dashPattern
    if (this.props.lineStyle === 'dashed') return [Math.max(4, thickness * 4), Math.max(3, thickness * 3)]
    if (this.props.lineStyle === 'dotted') return [Math.max(1, thickness), Math.max(2, thickness * 2)]
    return undefined
  }

  private pushHorizontalLine(
    schema: NovaSchema,
    x: number,
    y: number,
    width: number,
    thickness: number,
    color: string,
    opacity: number,
    dashPattern?: Array<number>,
  ): void {
    if (width <= 0 || thickness <= 0) return
    if (this.props.lineStyle !== 'double') {
      schema.push({ type: 'line', x1: x, y1: y, x2: x + width, y2: y, styles: { color, width: thickness, opacity, dashPattern } })
      return
    }

    const lineWidth = Math.max(1, Math.min(thickness, thickness / 3))
    const offset = Math.max(2, thickness * 2) / 2
    schema.push({ type: 'line', x1: x, y1: y - offset, x2: x + width, y2: y - offset, styles: { color, width: lineWidth, opacity } })
    schema.push({ type: 'line', x1: x, y1: y + offset, x2: x + width, y2: y + offset, styles: { color, width: lineWidth, opacity } })
  }

  private pushVerticalLine(
    schema: NovaSchema,
    x: number,
    y: number,
    height: number,
    thickness: number,
    color: string,
    opacity: number,
    dashPattern?: Array<number>,
  ): void {
    if (height <= 0 || thickness <= 0) return
    if (this.props.lineStyle !== 'double') {
      schema.push({ type: 'line', x1: x, y1: y, x2: x, y2: y + height, styles: { color, width: thickness, opacity, dashPattern } })
      return
    }

    const lineWidth = Math.max(1, Math.min(thickness, thickness / 3))
    const offset = Math.max(2, thickness * 2) / 2
    schema.push({ type: 'line', x1: x - offset, y1: y, x2: x - offset, y2: y + height, styles: { color, width: lineWidth, opacity } })
    schema.push({ type: 'line', x1: x + offset, y1: y, x2: x + offset, y2: y + height, styles: { color, width: lineWidth, opacity } })
  }
}
