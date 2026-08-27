import type { NovaApp, NovaElementSchema, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { NovaUiRootTarget } from '@/components/Root/root-target'
import type {
  NovaTooltipTargetResolver,
  TooltipDefinition,
  TooltipInput,
  TooltipProps,
  TooltipResolvedProps,
  TooltipSlotContext,
  TooltipTargetResolution,
} from '@/components/Tooltip/tooltip.types'
import type { NovaUiLayoutRect } from '@/shared/layout'
import {

  NovaNode,

  reconcileNovaTemplateChildren,
} from '@endge/nova'
import {
  NOVA_UI_ROOT_TARGET,

} from '@/components/Root/root-target'
import { SURFACE_SCHEMA_TYPE } from '@/components/Surface/surface.types'
import { createTooltipSchema, normalizeTooltipProps } from '@/components/Tooltip/tooltip.config'

interface RegisteredTooltipSource {
  sourceId: string
  definitions: Array<TooltipDefinition>
}

interface ActiveTooltip {
  key: string
  props: TooltipResolvedProps
  slot?: TooltipDefinition['slot']
  slotContext: TooltipSlotContext
  anchor: NovaUiLayoutRect
}

const DEFAULT_TOOLTIP_PROPS: TooltipProps = {
  type: 'default',
  placement: 'top',
  delay: 300,
  hideDelay: 80,
  width: 180,
  height: 34,
  background: '#111827',
  color: '#ffffff',
  border: {
    color: 'rgba(255,255,255,0.12)',
    width: 1,
    radius: 7,
  },
  padding: {
    horizontal: 10,
    vertical: 7,
  },
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: 13,
  fontWeight: '500',
  lineHeight: 18,
  collision: {
    boundary: 'canvas',
    padding: 8,
    flip: true,
    shift: true,
  },
}

/** Единственный overlay-controller tooltip-ов внутри одного UI Kit Root. */
export class RootTooltipControllerNode<E extends EventList = Record<string, any>> extends NovaNode<E> {
  readonly [NOVA_UI_ROOT_TARGET] = true as const

  private readonly _sources = new Map<string, RegisteredTooltipSource>()
  private readonly _definitions = new Map<string, TooltipDefinition>()
  private readonly _managedChildren: Array<NovaNode<E>> = []
  private _activeTooltip: ActiveTooltip | null = null
  private _activeTargetKey = ''
  private _openTimer = 0
  private _hideTimer = 0
  private _mutedUntil = 0

  /** Создает controller-node и размещает его поверх Root. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    private readonly _ownerRoot?: NovaNode<E> & NovaUiRootTarget,
  ) {
    super(app, surface)
    this.options({
      x: 0,
      y: 0,
      width: app.width,
      height: app.height,
      zIndex: 50_000,
      interactive: false,
    })
  }

  /** Проксирует Root API для UI Kit компонентов внутри tooltip portal. */
  getApi(): ReturnType<NovaUiRootTarget['getApi']> {
    if (!this._ownerRoot) {
      throw new Error('[Nova UI Kit] Tooltip portal is not attached to Root')
    }
    return this._ownerRoot.getApi()
  }

  /** Проксирует style cascade refresh для UI Kit компонентов внутри tooltip portal. */
  refreshStyleCascade(): void {
    this._ownerRoot?.refreshStyleCascade()
  }

  /** Синхронизирует размер controller с Root. */
  syncRootRect(width: number, height: number): void {
    this.options({ width, height })
  }

  /** Регистрирует definitions из одного Tooltips source. */
  registerDefinitions(sourceId: string, definitions: Array<TooltipDefinition>): void {
    this._sources.set(sourceId, { sourceId, definitions })
    this._rebuildDefinitions()
  }

  /** Удаляет definitions одного Tooltips source. */
  unregisterDefinitions(sourceId: string): void {
    this._sources.delete(sourceId)
    this._rebuildDefinitions()
  }

  /** Обрабатывает pointer move на уровне Root capture path. */
  handlePointerMove(event: MouseEvent): void {
    if (Date.now() < this._mutedUntil) {
      this.closeNow()
      return
    }

    const { x, y } = this.nova.events.getCanvasMousePosition(event)
    const target = this.nova.events.hitTest(x, y)
    const resolution = this._resolveTargetTooltip(target, x, y, event)
    if (!resolution || !resolution.tooltip) {
      this._scheduleClose()
      return
    }

    const normalized = normalizeTooltipInput(resolution.tooltip)
    if (!normalized) {
      this._scheduleClose()
      return
    }

    const anchor = resolution.rect ?? nodeWorldRect(target)
    if (!anchor) {
      this._scheduleClose()
      return
    }

    const type = normalized.type ?? 'default'
    const definition = this._definitions.get(type) ?? this._definitions.get('default')
    const props = normalizeTooltipProps({
      ...DEFAULT_TOOLTIP_PROPS,
      ...(definition?.props ?? {}),
      ...normalized,
      type,
      open: true,
      content: resolveTooltipContent(type, normalized, definition),
    })
    const targetKey = [
      nodeTargetId(target),
      resolution.targetId ?? nodeTargetId(target) ?? 'target',
      type,
      props.placement,
      props.width,
      props.height,
      String(normalized.value ?? ''),
    ].join(':')
    const slotContext = createSlotContext(type, normalized, target, resolution, anchor, x, y)

    if (this._activeTargetKey === targetKey && this._activeTooltip) {
      this._activeTooltip = {
        key: targetKey,
        props,
        slot: definition?.slot,
        slotContext,
        anchor,
      }
      if (this._activeTooltip.props.followCursor || this._activeTooltip.props.placement === 'cursor') {
        this.dirty({ render: true, update: true })
      }
      return
    }

    window.clearTimeout(this._hideTimer)
    window.clearTimeout(this._openTimer)
    this._activeTargetKey = targetKey
    this._openTimer = window.setTimeout(() => {
      this._activeTooltip = {
        key: targetKey,
        props,
        slot: definition?.slot,
        slotContext,
        anchor,
      }
      this.dirty({ update: true, render: true })
    }, props.delay)
  }

  /** Закрывает tooltip при уходе pointer с canvas. */
  handlePointerLeave(): void {
    this._scheduleClose()
  }

  /** Закрывает активный tooltip без задержки. */
  closeNow(options: { suppressMs?: number } = {}): void {
    if (options.suppressMs && options.suppressMs > 0) {
      this._mutedUntil = Math.max(this._mutedUntil, Date.now() + options.suppressMs)
    }
    window.clearTimeout(this._openTimer)
    window.clearTimeout(this._hideTimer)
    if (!this._activeTooltip && !this._activeTargetKey) {
      return
    }
    this._activeTooltip = null
    this._activeTargetKey = ''
    this._reconcileChildren([])
    this.dirty({ update: true, render: true })
  }

  /** Обновляет custom slot child tree. */
  update(): void {
    if (!this._activeTooltip?.slot) {
      this._reconcileChildren([])
      return
    }

    const rect = resolveTooltipRect(this._activeTooltip.props, this._activeTooltip.anchor, this.width, this.height)
    const children = this._activeTooltip.slot(this._activeTooltip.slotContext)
    this._reconcileChildren([
      {
        type: SURFACE_SCHEMA_TYPE,
        id: 'nova-root-tooltip-surface',
        props: {
          ...surfacePropsFromTooltip(this._activeTooltip.props),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          className: this._activeTooltip.props.className,
          attrs: {
            ...(this._activeTooltip.props.attrs ?? {}),
            type: this._activeTooltip.props.type,
          },
        },
        children,
      },
    ])
  }

  /** Рисует simple tooltip schema для definitions без custom slot. */
  render(): void {
    const active = this._activeTooltip
    if (!active || active.slot) {
      this.renderer.schema([])
      return
    }

    const props = {
      ...active.props,
      x: active.props.placement === 'cursor' ? active.slotContext.pointer.x : active.anchor.x,
      y: active.props.placement === 'cursor' ? active.slotContext.pointer.y : active.anchor.y,
      width: active.props.placement === 'cursor' ? 0 : active.anchor.width,
      height: active.props.placement === 'cursor' ? 0 : active.anchor.height,
      open: true,
    }
    const schema = createTooltipSchema(props)
    shiftSchemaInsideBounds(schema, this.width, this.height, active.props.collision.padding)
    this.renderer.schema(schema)
  }

  /** Пересобирает итоговую map с учетом порядка source registration. */
  private _rebuildDefinitions(): void {
    this._definitions.clear()
    for (const source of this._sources.values()) {
      for (const definition of source.definitions) {
        this._definitions.set(definition.type || 'default', definition)
      }
    }
  }

  /** Находит tooltip payload у target node или у его внутреннего virtual target resolver. */
  private _resolveTargetTooltip(
    target: NovaNode<E> | null,
    x: number,
    y: number,
    event: MouseEvent,
  ): TooltipTargetResolution | null {
    if (!target || this._containsControllerNode(target)) {
      return null
    }

    const visited = new Set<NovaNode<E>>()
    let current: NovaNode<E> | undefined = target
    while (current) {
      if (visited.has(current)) {
        return null
      }
      visited.add(current)
      if (this._containsControllerNode(current)) {
        return null
      }

      const resolver = current as NovaNode<E> & Partial<NovaTooltipTargetResolver>
      const resolved = resolver.resolveNovaTooltipTarget?.({ x, y, event })
      if (resolved?.tooltip) {
        return resolved
      }

      const props = readNodeProps(current)
      const tooltip = props?.tooltip as TooltipInput
      if (tooltip) {
        return { tooltip, targetProps: props }
      }

      current = current.parent as NovaNode<E> | undefined
    }

    if (!this._containsRootNode(target)) {
      return null
    }
    return null
  }

  /** Проверяет, относится ли node к overlay subtree самого controller. */
  private _containsControllerNode(node: NovaNode<E>): boolean {
    let current: NovaNode<E> | undefined = node
    while (current) {
      if (current === this) {
        return true
      }
      current = current.parent as NovaNode<E> | undefined
    }
    return false
  }

  /** Проверяет, принадлежит ли target тому же Root tree, что и controller. */
  private _containsRootNode(node: NovaNode<E>): boolean {
    const root = this._ownerRoot
    let current: NovaNode<E> | undefined = node
    while (current) {
      if (current === root) {
        return true
      }
      current = current.parent as NovaNode<E> | undefined
    }
    return false
  }

  /** Планирует закрытие active tooltip. */
  private _scheduleClose(): void {
    window.clearTimeout(this._openTimer)
    if (!this._activeTooltip) {
      return
    }
    const hideDelay = this._activeTooltip.props.hideDelay
    window.clearTimeout(this._hideTimer)
    this._hideTimer = window.setTimeout(() => {
      this._activeTooltip = null
      this._activeTargetKey = ''
      this._reconcileChildren([])
      this.dirty({ update: true, render: true })
    }, hideDelay)
  }

  /** Патчит active slot subtree без накопления детей. */
  private _reconcileChildren(children: Array<NovaElementSchema<any>>): void {
    const reconciled = reconcileNovaTemplateChildren(this, this._managedChildren, children)
    this._managedChildren.length = 0
    this._managedChildren.push(...reconciled.nodes)
  }
}

function normalizeTooltipInput(input: TooltipInput): (Record<string, unknown> & { type?: string, value?: unknown }) | null {
  if (typeof input === 'string') {
    return input ? { type: 'default', value: input } : null
  }
  if (!input || typeof input === 'boolean') {
    return null
  }
  const payload = input as Record<string, unknown>
  return {
    ...payload,
    type: typeof payload.type === 'string' && payload.type ? payload.type : 'default',
  }
}

function resolveTooltipContent(
  type: string,
  input: Record<string, unknown> & { value?: unknown },
  definition?: TooltipDefinition,
): TooltipProps['content'] {
  const explicitContent = input.content as TooltipProps['content'] | undefined
  if (explicitContent) {
    return explicitContent
  }
  const mode = input.contentMode ?? definition?.props?.contentMode ?? definition?.props?.content
  const value = input.value ?? input.text ?? input.title ?? ''
  if (mode === 'markdown') {
    return { markdown: String(value) }
  }
  if (mode === 'schema' && Array.isArray(value)) {
    return { schema: value as NovaSchema }
  }
  return { text: String(value || type) }
}

function createSlotContext(
  type: string,
  input: Record<string, unknown> & { value?: unknown },
  target: NovaNode<any> | null,
  resolution: TooltipTargetResolution,
  anchor: NovaUiLayoutRect,
  x: number,
  y: number,
): TooltipSlotContext {
  return {
    ...input,
    type,
    value: input.value,
    target: {
      id: resolution.targetId ?? nodeTargetId(target) ?? '',
      type: resolution.targetType ?? target?.__type ?? '',
      rect: { ...anchor },
      props: resolution.targetProps ?? readNodeProps(target),
      node: target ?? undefined,
    },
    pointer: { x, y },
  }
}

function readNodeProps(node: NovaNode<any> | null): Record<string, unknown> | undefined {
  const api = (node as unknown as { getProps?: () => Record<string, unknown> } | null)?.getProps
  return typeof api === 'function' ? api.call(node) : undefined
}

function nodeTargetId(node: NovaNode<any> | null): string {
  if (!node) {
    return ''
  }
  return (node as NovaNode<any> & { componentId?: string }).componentId ?? node.id
}

function nodeWorldRect(node: NovaNode<any> | null): NovaUiLayoutRect | null {
  if (!node) {
    return null
  }
  const bounds = node.getWorldBounds()
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

function surfacePropsFromTooltip(props: TooltipResolvedProps): TooltipProps {
  return {
    background: props.background,
    color: props.color,
    border: props.border,
    padding: props.padding,
    opacity: props.opacity,
    clip: true,
  }
}

function resolveTooltipRect(
  props: TooltipResolvedProps,
  anchor: NovaUiLayoutRect,
  rootWidth: number,
  rootHeight: number,
): NovaUiLayoutRect {
  const width = props.width
  const height = props.height
  const gap = 8
  let x = anchor.x + (anchor.width - width) / 2
  let y = anchor.y - height - gap

  if (props.placement === 'bottom') {
    y = anchor.y + anchor.height + gap
  }
  else if (props.placement === 'left') {
    x = anchor.x - width - gap
    y = anchor.y + (anchor.height - height) / 2
  }
  else if (props.placement === 'right') {
    x = anchor.x + anchor.width + gap
    y = anchor.y + (anchor.height - height) / 2
  }
  else if (props.placement === 'cursor') {
    x = anchor.x + gap
    y = anchor.y + gap
  }

  const padding = props.collision.padding
  return {
    x: Math.max(padding, Math.min(x, rootWidth - width - padding)),
    y: Math.max(padding, Math.min(y, rootHeight - height - padding)),
    width,
    height,
  }
}

function shiftSchemaInsideBounds(schema: NovaSchema, width: number, height: number, padding: number): void {
  let maxX = 0
  let maxY = 0
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  for (const item of schema) {
    const shape = item as Record<string, any>
    const x = Number(shape.x ?? 0)
    const y = Number(shape.y ?? 0)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + Number(shape.width ?? 0))
    maxY = Math.max(maxY, y + Number(shape.height ?? 0))
  }
  const dx = Math.max(0, padding - minX) + Math.min(0, width - padding - maxX)
  const dy = Math.max(0, padding - minY) + Math.min(0, height - padding - maxY)
  if (dx === 0 && dy === 0) {
    return
  }
  for (const item of schema) {
    const shape = item as Record<string, any>
    shape.x = (shape.x ?? 0) + dx
    shape.y = (shape.y ?? 0) + dy
  }
}
