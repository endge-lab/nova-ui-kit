import {
  reconcileNovaTemplateChildren,
  type NovaApp,
  type NovaComponentSchema,
  type NovaNode,
  type NovaSchema,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  TOOLTIP_NODE_DESCRIPTOR,
  normalizeTooltipProps,
  type TooltipDescriptor,
} from '@/components/Tooltip/tooltip.config'
import type { TooltipApi, TooltipProps, TooltipResolvedProps } from '@/components/Tooltip/tooltip.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  resolveComponentTextStyle,
 pushText } from '@/shared/component'
import { resolveSpacing } from '@/shared/layout'

export class Tooltip<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<TooltipResolvedProps, TooltipApi, TooltipProps, E> {
  private triggerNode: NovaNode<E> | null = null
  private openTimer = 0
  private readonly api: TooltipApi

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: TooltipProps = {},
    options: { componentId?: string; trigger?: NovaComponentSchema; children?: Array<NovaComponentSchema> } = {},
    descriptor: TooltipDescriptor = TOOLTIP_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeTooltipProps(props), options)
    this.api = {
      open: () => this.setProps({ open: true }),
      close: () => this.setProps({ open: false }),
      toggle: () => this.setProps({ open: !this.props.open }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setTrigger(options.trigger ?? options.children?.[0])
    this.setupEvents()
  }

  override setProps(patch: TooltipProps): this {
    return super.setProps(patch as Partial<TooltipResolvedProps>)
  }

  override getApi(): TooltipApi {
    return this.api
  }

  setTrigger(schema: NovaComponentSchema | undefined): void {
    const reconciled = reconcileNovaTemplateChildren(
      this,
      this.triggerNode ? [this.triggerNode] : [],
      schema ? [schema] : [],
    )
    this.triggerNode = reconciled.nodes[0] ?? null
    this.dirty({ update: true, render: true })
  }

  update(): void {
    this.triggerNode?.options({
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
    })
  }

  render(): void {
    if (!this.props.open || !this.props.content) return

    const bubble = this.resolveBubbleRect()
    const bubbleProps = {
      ...this.props,
      x: bubble.x,
      y: bubble.y,
      width: bubble.width,
      height: bubble.height,
      background: this.props.background,
    }
    const schema: NovaSchema = buildBoxSchema(bubbleProps, bubble.width, bubble.height)
    const padding = resolveSpacing(this.props.padding)
    pushText(
      schema,
      this.props.content,
      padding.left,
      padding.top,
      Math.max(0, bubble.width - padding.left - padding.right),
      Math.max(0, bubble.height - padding.top - padding.bottom),
      resolveComponentTextStyle(this.props, this.inheritedStyleContext),
    )
    for (const item of schema) {
      const shape = item as Record<string, any>
      shape.x = (shape.x ?? 0) + bubble.x
      shape.y = (shape.y ?? 0) + bubble.y
    }
    this.renderer.schema(schema)
  }

  protected override onPropsChanged(changedKeys: Array<keyof TooltipResolvedProps>): void {
    this.props = normalizeTooltipProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  private setupEvents(): void {
    this.on('mouseenter', () => {
      if (this.props.disabled) return
      window.clearTimeout(this.openTimer)
      this.openTimer = window.setTimeout(() => this.setProps({ open: true }), this.props.delay)
    })
    this.on('mouseleave', () => {
      window.clearTimeout(this.openTimer)
      this.setProps({ open: false })
    })
    this.on('focus', () => {
      if (!this.props.disabled) this.setProps({ open: true })
    })
    this.on('blur', () => this.setProps({ open: false }))
  }

  private resolveBubbleRect(): { x: number; y: number; width: number; height: number } {
    const width = Math.max(120, Math.min(260, this.props.content.length * 7 + 28))
    const height = 34
    const gap = 8
    if (this.props.placement === 'bottom') return { x: (this.width - width) / 2, y: this.height + gap, width, height }
    if (this.props.placement === 'left') return { x: -width - gap, y: (this.height - height) / 2, width, height }
    if (this.props.placement === 'right') return { x: this.width + gap, y: (this.height - height) / 2, width, height }
    return { x: (this.width - width) / 2, y: -height - gap, width, height }
  }
}
