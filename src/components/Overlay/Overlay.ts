import {
  reconcileNovaTemplateChildren,
  type NovaApp,
  type NovaNode,
  type NovaSchema,
  type NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  OVERLAY_NODE_DESCRIPTOR,
  normalizeOverlayProps,
  type OverlayDescriptor,
} from '@/components/Overlay/overlay.config'
import type {
  OverlayApi,
  OverlayProps,
  OverlayResolvedProps,
  OverlaySchema,
} from '@/components/Overlay/overlay.types'
import { NovaUiComponentNode, buildBoxSchema } from '@/shared/component'
import { applyNodeLayoutRect, createLayoutRect, resolveSpacing } from '@/shared/layout'
import type { NovaUiOverlayAnchor } from '@/shared/overlay/overlay.types'
import { resolveNovaUiOverlayPosition } from '@/shared/overlay/overlay-position'

/** Низкоуровневый anchored overlay surface с произвольным Nova UI body. */
export class Overlay<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<OverlayResolvedProps, OverlayApi, OverlayProps, E> {
  private readonly bodyNodes: Array<NovaNode<E>> = []
  private readonly surfaceRect = createLayoutRect()
  private readonly bodyRect = createLayoutRect()
  private bodyLayoutReady = false
  private readonly api: OverlayApi

  /** Создает overlay node и синхронизирует вложенный body. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: OverlayProps = {},
    options: { componentId?: string; children?: OverlaySchema['children'] } = {},
    descriptor: OverlayDescriptor = OVERLAY_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeOverlayProps(props), options)
    this.api = {
      open: event => this.setOpen(true, event),
      close: event => this.setOpen(false, event),
      toggle: event => this.setOpen(!this.props.open, event),
      moveTo: (x, y, event) => this.moveTo(x, y, event),
      setAnchor: anchor => this.setProps({ anchor }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    reconcileNovaTemplateChildren(this, this.bodyNodes, options.children ?? []).nodes.forEach(node => this.bodyNodes.push(node))
    this.applyOpenState()
    this.applyBodyOpenState()
    this.setupEvents()
  }

  /** Обновляет props overlay. */
  override setProps(patch: OverlayProps): this {
    return super.setProps(patch as Partial<OverlayResolvedProps>)
  }

  /** Возвращает публичный API overlay. */
  override getApi(): OverlayApi {
    return this.api
  }

  /** Раскладывает body в рассчитанный overlay rect. */
  update(): void {
    if (!this.props.open) {
      this.bodyLayoutReady = false
      this.applyBodyOpenState()
      return
    }

    this.resolveRects()
    for (const child of this.bodyNodes) applyNodeLayoutRect(child as NovaNode<any>, this.bodyRect)
    this.bodyLayoutReady = true
    this.applyBodyOpenState()
  }

  /** Рисует backdrop и поверхность overlay. */
  render(): void {
    if (!this.props.open) {
      this.renderer.schema([])
      return
    }

    this.resolveRects()
    const schema: NovaSchema = []
    if (this.props.modal || this.props.backdrop) {
      schema.push({
        type: 'rect',
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        styles: { background: 'rgba(15,23,42,0.18)' },
      })
    }

    const surface = buildBoxSchema(this.props, this.surfaceRect.width, this.surfaceRect.height)
    for (const item of surface) {
      const shape = item as Record<string, any>
      shape.x = (shape.x ?? 0) + this.surfaceRect.x
      shape.y = (shape.y ?? 0) + this.surfaceRect.y
      schema.push(item)
    }
    this.renderer.schema(schema)
  }

  /** Нормализует props и обновляет open state. */
  protected override onPropsChanged(changedKeys: Array<keyof OverlayResolvedProps>): void {
    this.props = normalizeOverlayProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    if (changedKeys.includes('open') || changedKeys.includes('display')) {
      if (!this.props.open || this.props.display === 'none') this.bodyLayoutReady = false
      this.applyOpenState()
      this.applyBodyOpenState()
    }
  }

  /** Переключает открытость overlay. */
  private setOpen(open: boolean, event?: Event): void {
    if (open === this.props.open) return
    this.setProps({ open })
    this.props.onOpenChange?.(open, event)
  }

  /** Переносит overlay в pointer anchor. */
  private moveTo(x: number, y: number, event?: Event): void {
    this.setProps({ anchor: { kind: 'pointer', x, y } })
    this.props.onOpenChange?.(true, event)
  }

  /** Настраивает dismiss-события overlay. */
  private setupEvents(): void {
    this.on('mousedown', event => {
      const { x, y } = this.events.getCanvasMousePosition(event)
      const [localX, localY] = this.toLocal(x, y)
      if (
        this.props.dismiss.outside &&
        (localX < this.surfaceRect.x ||
          localX > this.surfaceRect.x + this.surfaceRect.width ||
          localY < this.surfaceRect.y ||
          localY > this.surfaceRect.y + this.surfaceRect.height)
      ) {
        this.setOpen(false, event)
      }
      return false
    })
    this.on('keydown', event => {
      if (this.props.open && this.props.dismiss.escape && event.key === 'Escape') this.setOpen(false, event)
    })
  }

  /** Синхронизирует интерактивность node с состоянием open. */
  private applyOpenState(): void {
    const displayed = this.props.display !== 'none' && this.props.open
    this.visible = displayed
    this.active = displayed
    this.options({ interactive: displayed })
  }

  /** Синхронизирует видимость body nodes после layout. */
  private applyBodyOpenState(): void {
    const displayed = this.props.display !== 'none' && this.props.open && this.bodyLayoutReady
    for (const node of this.bodyNodes) {
      node.visible = displayed
      node.active = displayed
      node.dirty({ update: true, render: true })
    }
  }

  /** Рассчитывает surface и body rect относительно Root. */
  private resolveRects(): void {
    const root = { x: 0, y: 0, width: this.width, height: this.height }
    const position = resolveNovaUiOverlayPosition({
      root,
      anchor: this.normalizeAnchor(this.props.anchor),
      overlay: { width: this.props.width, height: this.props.height },
      placement: this.props.placement,
      offset: this.props.offset,
      collision: this.props.collision,
    })
    Object.assign(this.surfaceRect, {
      x: position.x,
      y: position.y,
      width: this.props.width,
      height: this.props.height,
    })
    const padding = resolveSpacing(this.props.padding)
    Object.assign(this.bodyRect, {
      x: this.surfaceRect.x + padding.left,
      y: this.surfaceRect.y + padding.top,
      width: Math.max(0, this.surfaceRect.width - padding.left - padding.right),
      height: Math.max(0, this.surfaceRect.height - padding.top - padding.bottom),
    })
  }

  /** Нормализует anchor в систему координат Root. */
  private normalizeAnchor(anchor: NovaUiOverlayAnchor): NovaUiOverlayAnchor {
    if (anchor.kind === 'root') return { kind: 'root' }
    return anchor
  }
}
