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
  createTooltipSchema,
  normalizeTooltipProps,
  type TooltipDescriptor,
} from '@/components/Tooltip/tooltip.config'
import type {
  TooltipApi,
  TooltipContent,
  TooltipPointerButton,
  TooltipProps,
  TooltipResolvedProps,
} from '@/components/Tooltip/tooltip.types'
import {
  NovaUiComponentNode,
} from '@/shared/component'

/**
 * Описывает ответственность Tooltip в архитектуре проекта.
 */
export class Tooltip<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<TooltipResolvedProps, TooltipApi, TooltipProps, E> {
  private triggerNode: NovaNode<E> | null = null
  private openTimer = 0
  private hideTimer = 0
  private anchorX = 0
  private anchorY = 0
  private readonly api: TooltipApi

  /**
   * Создает экземпляр Tooltip и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: TooltipProps = {},
    options: { componentId?: string; trigger?: NovaComponentSchema; children?: Array<NovaComponentSchema> } = {},
    descriptor: TooltipDescriptor = TOOLTIP_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeTooltipProps(props), options)
    this.api = {
      open: event => this.setOpen(true, event),
      close: event => this.setOpen(false, event),
      toggle: event => this.setOpen(!this.props.open, event),
      moveTo: (x, y) => this.moveTo(x, y),
      setContent: content => this.setContent(content),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setTrigger(options.trigger ?? options.children?.[0])
    this.setupEvents()
  }

  /**
   * Обновляет значение состояния Tooltip.
   */
  override setProps(patch: TooltipProps | Partial<TooltipResolvedProps>): this {
    return super.setProps(patch as Partial<TooltipResolvedProps>)
  }

  /**
   * Возвращает значение состояния Tooltip.
   */
  override getApi(): TooltipApi {
    return this.api
  }

  /**
   * Обновляет значение состояния Tooltip.
   */
  setTrigger(schema: NovaComponentSchema | undefined): void {
    const reconciled = reconcileNovaTemplateChildren(
      this,
      this.triggerNode ? [this.triggerNode] : [],
      schema ? [schema] : [],
    )
    this.triggerNode = reconciled.nodes[0] ?? null
    this.dirty({ update: true, render: true })
  }

  /**
   * Обновляет runtime-состояние Tooltip.
   */
  update(): void {
    this.triggerNode?.options({
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
    })
  }

  /**
   * Выполняет отрисовку Tooltip.
   */
  render(): void {
    const schema = createTooltipSchema({
      ...this.props,
      x: this.props.placement === 'cursor' ? this.anchorX : 0,
      y: this.props.placement === 'cursor' ? this.anchorY : 0,
      width: this.props.placement === 'cursor' ? 0 : this.width,
      height: this.props.placement === 'cursor' ? 0 : this.height,
    })

    this.applyCollision(schema)
    this.renderer.schema(schema)
  }

  /**
   * Обрабатывает входящее событие Tooltip.
   */
  protected override onPropsChanged(changedKeys: Array<keyof TooltipResolvedProps>): void {
    this.props = normalizeTooltipProps(this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  /**
   * Обновляет значение состояния Tooltip.
   */
  private setupEvents(): void {
    this.on('mouseenter', () => {
      if (this.shouldOpenOnPointer('hover')) this.scheduleOpen()
    })
    this.on('mouseleave', () => {
      if (this.shouldOpenOnPointer('hover')) this.scheduleClose()
    })
    this.on('focus', () => {
      if (this.shouldOpenOnFocus()) this.scheduleOpen()
    })
    this.on('blur', () => {
      if (this.shouldOpenOnFocus()) this.scheduleClose()
    })
    this.on('click', event => {
      if (this.shouldOpenOnPointer('click', event as unknown as PointerEvent)) this.setOpen(!this.props.open, event as unknown as Event)
    })
  }

  /**
   * Обновляет значение состояния Tooltip.
   */
  private setOpen(open: boolean, event?: Event): void {
    window.clearTimeout(this.openTimer)
    window.clearTimeout(this.hideTimer)
    if (this.props.open === open) return
    this.setProps({ open })
    this.props.onOpenChange?.(open, event)
    if (open) this.props.onShow?.(event)
    else this.props.onHide?.(event)
  }

  /**
   * Выполняет внутренний шаг moveTo для Tooltip.
   */
  private moveTo(x: number, y: number): void {
    this.anchorX = x
    this.anchorY = y
    if (this.props.open && this.props.followCursor) this.dirty({ render: true })
  }

  /**
   * Обновляет значение состояния Tooltip.
   */
  private setContent(content: TooltipContent): void {
    this.setProps({ content })
  }

  /**
   * Планирует отложенное выполнение Tooltip.
   */
  private scheduleOpen(event?: Event): void {
    if (this.props.disabled) return
    window.clearTimeout(this.hideTimer)
    window.clearTimeout(this.openTimer)
    this.openTimer = window.setTimeout(() => this.setOpen(true, event), this.props.delay)
  }

  /**
   * Планирует отложенное выполнение Tooltip.
   */
  private scheduleClose(event?: Event): void {
    window.clearTimeout(this.openTimer)
    window.clearTimeout(this.hideTimer)
    this.hideTimer = window.setTimeout(() => this.setOpen(false, event), this.props.hideDelay)
  }

  /**
   * Выполняет внутренний шаг shouldOpenOnFocus для Tooltip.
   */
  private shouldOpenOnFocus(): boolean {
    if (this.props.disabled || this.props.trigger === 'manual') return false
    if (this.props.trigger === 'focus') return true
    if (typeof this.props.trigger === 'object') return this.props.trigger.keyboard === 'focus'

    return this.props.trigger === 'hover'
  }

  /**
   * Выполняет внутренний шаг shouldOpenOnPointer для Tooltip.
   */
  private shouldOpenOnPointer(kind: 'hover' | 'click', event?: PointerEvent): boolean {
    if (this.props.disabled || this.props.trigger === 'manual') return false
    if (this.props.trigger === kind) return true
    if (this.props.trigger === 'hover' && kind === 'hover') return true
    if (this.props.trigger === 'click' && kind === 'click') return true
    if (typeof this.props.trigger !== 'object') return false
    if (this.props.trigger.pointer !== kind) return false
    if (event && this.props.trigger.button && !matchesPointerButton(event, this.props.trigger.button)) return false
    if (event && this.props.trigger.modifier && !matchesModifier(event, this.props.trigger.modifier)) return false

    return true
  }

  /**
   * Применяет подготовленное состояние Tooltip.
   */
  private applyCollision(schema: NovaSchema): void {
    if (schema.length === 0 || !this.props.collision.shift) return

    const bounds = resolveSchemaBounds(schema)
    const padding = this.props.collision.padding
    const maxX = this.props.collision.boundary === 'parent'
      ? this.width - padding
      : (this.nova.canvas?.width ?? this.width) - padding
    const maxY = this.props.collision.boundary === 'parent'
      ? this.height - padding
      : (this.nova.canvas?.height ?? this.height) - padding
    const dx = Math.min(0, maxX - (bounds.x + bounds.width)) + Math.max(0, padding - bounds.x)
    const dy = Math.min(0, maxY - (bounds.y + bounds.height)) + Math.max(0, padding - bounds.y)

    if (dx === 0 && dy === 0) return
    for (const item of schema) {
      const shape = item as Record<string, any>
      shape.x = (shape.x ?? 0) + dx
      shape.y = (shape.y ?? 0) + dy
    }
  }
}

function matchesPointerButton(event: PointerEvent, button: TooltipPointerButton): boolean {
  if (button === 'left') return event.button === 0
  if (button === 'middle') return event.button === 1

  return event.button === 2
}

function matchesModifier(event: PointerEvent, modifier: 'ctrl' | 'meta' | 'shift' | 'alt'): boolean {
  if (modifier === 'ctrl') return event.ctrlKey
  if (modifier === 'meta') return event.metaKey
  if (modifier === 'shift') return event.shiftKey

  return event.altKey
}

function resolveSchemaBounds(schema: NovaSchema): { x: number; y: number; width: number; height: number } {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const item of schema) {
    const shape = item as Record<string, any>
    const x = Number(shape.x ?? 0)
    const y = Number(shape.y ?? 0)
    const width = Number(shape.width ?? 0)
    const height = Number(shape.height ?? 0)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return { x: 0, y: 0, width: 0, height: 0 }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}
