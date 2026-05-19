import { reconcileNovaTemplateChildren, type NovaApp, type NovaNode, type NovaSchema, type NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  PANEL_NODE_DESCRIPTOR,
  normalizePanelProps,
  type PanelDescriptor,
} from '@/components/Panel/panel.config'
import type {
  PanelApi,
  PanelChildSchema,
  PanelProps,
  PanelResolvedProps,
} from '@/components/Panel/panel.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  resolveComponentTextStyle,
 pushText } from '@/shared/component'
import {
  applyNodeLayoutRect,
  copyRect,
  createLayoutRect,
  resolveSpacing,
} from '@/shared/layout'

/**
 * Описывает ответственность Panel в архитектуре проекта.
 */
export class Panel<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<PanelResolvedProps, PanelApi, PanelProps, E> {
  private readonly childrenNodes: Array<NovaNode<E>> = []
  private readonly bodyRect = createLayoutRect()
  private readonly api: PanelApi

  /**
   * Создает экземпляр Panel и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: PanelProps = {},
    options: { componentId?: string; children?: Array<PanelChildSchema> } = {},
    descriptor: PanelDescriptor = PANEL_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizePanelProps(props), options)
    this.api = {
      setChildren: children => this.setChildren(children),
      setTitle: title => this.setProps({ title }),
      setProps: patch => this.setProps(patch),
      getBodyRect: () => this.bodyRect,
      getProps: () => this.props,
    }
    this.setChildren(options.children ?? [])
  }

  /**
   * Обновляет значение состояния Panel.
   */
  override setProps(patch: PanelProps): this {
    return super.setProps(patch as Partial<PanelResolvedProps>)
  }

  /**
   * Возвращает значение состояния Panel.
   */
  override getApi(): PanelApi {
    return this.api
  }

  /**
   * Обновляет значение состояния Panel.
   */
  setChildren(children: Array<PanelChildSchema>): void {
    const reconciled = reconcileNovaTemplateChildren(this, this.childrenNodes, children)
    this.childrenNodes.length = 0
    this.childrenNodes.push(...reconciled.nodes)
    this.dirty({ update: true, render: true })
  }

  /**
   * Обновляет runtime-состояние Panel.
   */
  update(): void {
    const padding = resolveSpacing(this.props.padding)
    const headerHeight = this.props.title || this.props.subtitle
      ? this.props.density === 'compact' ? 44 : this.props.density === 'spacious' ? 72 : 58
      : 0
    copyRect(this.bodyRect, {
      x: padding.left,
      y: padding.top + headerHeight,
      width: Math.max(0, this.width - padding.left - padding.right),
      height: Math.max(0, this.height - padding.top - padding.bottom - headerHeight),
    })
    for (const child of this.childrenNodes) {
      applyNodeLayoutRect(child as NovaNode<any>, this.bodyRect)
      child.dirty({ matrix: true, update: true, render: true })
    }
  }

  /**
   * Выполняет отрисовку Panel.
   */
  render(): void {
    const schema: NovaSchema = buildBoxSchema(this.props, this.width, this.height)
    const padding = resolveSpacing(this.props.padding)
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
    if (this.props.title) {
      pushText(schema, this.props.title, padding.left, padding.top, Math.max(0, this.width - padding.left - padding.right), 24, {
        ...textStyle,
        fontSize: Math.max(textStyle.fontSize, 16),
        fontWeight: '800',
        lineHeight: 22,
      })
    }
    if (this.props.subtitle) {
      pushText(schema, this.props.subtitle, padding.left, padding.top + 25, Math.max(0, this.width - padding.left - padding.right), 20, {
        ...textStyle,
        color: '#64748b',
        fontSize: Math.max(11, textStyle.fontSize - 1),
        lineHeight: 18,
      })
    }
    this.renderer.schema(schema)
    if (this.props.clip) this.renderer.clip(0, 0, this.width, this.height)
  }

  /**
   * Обрабатывает входящее событие Panel.
   */
  protected override onPropsChanged(changedKeys: Array<keyof PanelResolvedProps>): void {
    this.props = normalizePanelProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    this.dirty({ update: true, render: true })
  }
}
