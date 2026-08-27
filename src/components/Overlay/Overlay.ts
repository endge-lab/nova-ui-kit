import type { NovaApp, NovaNode, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { OverlayDescriptor } from '@/components/Overlay/overlay.config'
import type {
  OverlayApi,
  OverlayProps,
  OverlayResolvedProps,
  OverlaySchema,
} from '@/components/Overlay/overlay.types'
import type { NovaUiOverlayAnchor } from '@/shared/overlay/overlay.types'
import {

  reconcileNovaTemplateChildren,
} from '@endge/nova'
import {
  normalizeOverlayProps,
  OVERLAY_NODE_DESCRIPTOR,

} from '@/components/Overlay/overlay.config'
import { buildBoxSchema, NovaUiComponentNode } from '@/shared/component'
import { applyNodeLayoutRect, createLayoutRect, resolveSpacing } from '@/shared/layout'
import { resolveNovaUiOverlayPosition } from '@/shared/overlay/overlay-position'

/** Низкоуровневый anchored overlay surface с произвольным Nova UI body. */
export class Overlay<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<OverlayResolvedProps, OverlayApi, OverlayProps, E> {
  private readonly _bodyNodes: Array<NovaNode<E>> = []
  private readonly _surfaceRect = createLayoutRect()
  private readonly _bodyRect = createLayoutRect()
  private _bodyLayoutReady = false
  private readonly _api: OverlayApi

  /** Создает overlay node и синхронизирует вложенный body. */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: OverlayProps = {},
    options: { componentId?: string, children?: OverlaySchema['children'] } = {},
    descriptor: OverlayDescriptor = OVERLAY_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeOverlayProps(props), options)
    this._api = {
      open: event => this._setOpen(true, event),
      close: event => this._setOpen(false, event),
      toggle: event => this._setOpen(!this.props.open, event),
      moveTo: (x, y, event) => this._moveTo(x, y, event),
      setAnchor: anchor => this.setProps({ anchor }),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    reconcileNovaTemplateChildren(this, this._bodyNodes, options.children ?? []).nodes.forEach(node => this._bodyNodes.push(node))
    this._applyOpenState()
    this._applyBodyOpenState()
    this._setupEvents()
  }

  /** Обновляет props overlay. */
  override setProps(patch: OverlayProps): this {
    return super.setProps(patch as Partial<OverlayResolvedProps>)
  }

  /** Возвращает публичный API overlay. */
  override getApi(): OverlayApi {
    return this._api
  }

  /** Раскладывает body в рассчитанный overlay rect. */
  update(): void {
    if (!this.props.open) {
      this._bodyLayoutReady = false
      this._applyBodyOpenState()
      return
    }

    this._resolveRects()
    for (const child of this._bodyNodes) {
      applyNodeLayoutRect(child as NovaNode<any>, this._bodyRect)
    }
    this._bodyLayoutReady = true
    this._applyBodyOpenState()
  }

  /** Рисует backdrop и поверхность overlay. */
  render(): void {
    if (!this.props.open) {
      this.renderer.schema([])
      return
    }

    this._resolveRects()
    const schema: NovaSchema = []
    if (this.props.modal || this.props.backdrop) {
      schema.push({
        type: 'rect',
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        styles: { background: this.resolveThemeValue('var(--nova-overlay-backdrop-background, rgba(15,23,42,0.18))') },
      })
    }

    const surface = buildBoxSchema(this.props, this._surfaceRect.width, this._surfaceRect.height, { resolveThemeValue: value => this.resolveThemeValue(value) })
    for (const item of surface) {
      const shape = item as Record<string, any>
      shape.x = (shape.x ?? 0) + this._surfaceRect.x
      shape.y = (shape.y ?? 0) + this._surfaceRect.y
      schema.push(item)
    }
    this.renderer.schema(schema)
  }

  /** Нормализует props и обновляет open state. */
  protected override onPropsChanged(changedKeys: Array<keyof OverlayResolvedProps>): void {
    this.props = normalizeOverlayProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    if (changedKeys.includes('open') || changedKeys.includes('display')) {
      if (!this.props.open || this.props.display === 'none') {
        this._bodyLayoutReady = false
      }
      this._applyOpenState()
      this._applyBodyOpenState()
    }
  }

  /** Переключает открытость overlay. */
  private _setOpen(open: boolean, event?: Event): void {
    if (open === this.props.open) {
      return
    }
    this.setProps({ open })
    this.props.onOpenChange?.(open, event)
  }

  /** Переносит overlay в pointer anchor. */
  private _moveTo(x: number, y: number, event?: Event): void {
    this.setProps({ anchor: { kind: 'pointer', x, y } })
    this.props.onOpenChange?.(true, event)
  }

  /** Настраивает dismiss-события overlay. */
  private _setupEvents(): void {
    this.on('mousedown', (event) => {
      const { x, y } = this.events.getCanvasMousePosition(event)
      const [localX, localY] = this.toLocal(x, y)
      if (
        this.props.dismiss.outside
        && (localX < this._surfaceRect.x
          || localX > this._surfaceRect.x + this._surfaceRect.width
          || localY < this._surfaceRect.y
          || localY > this._surfaceRect.y + this._surfaceRect.height)
      ) {
        this._setOpen(false, event)
      }
      return false
    })
    this.on('keydown', (event) => {
      if (this.props.open && this.props.dismiss.escape && event.key === 'Escape') {
        this._setOpen(false, event)
      }
    })
  }

  /** Синхронизирует интерактивность node с состоянием open. */
  private _applyOpenState(): void {
    const displayed = this.props.display !== 'none' && this.props.open
    this.visible = displayed
    this.active = displayed
    this.options({ interactive: displayed })
  }

  /** Синхронизирует видимость body nodes после layout. */
  private _applyBodyOpenState(): void {
    const displayed = this.props.display !== 'none' && this.props.open && this._bodyLayoutReady
    for (const node of this._bodyNodes) {
      node.visible = displayed
      node.active = displayed
      node.dirty({ update: true, render: true })
    }
  }

  /** Рассчитывает surface и body rect относительно Root. */
  private _resolveRects(): void {
    const root = { x: 0, y: 0, width: this.width, height: this.height }
    const position = resolveNovaUiOverlayPosition({
      root,
      anchor: this._normalizeAnchor(this.props.anchor),
      overlay: { width: this.props.width, height: this.props.height },
      placement: this.props.placement,
      offset: this.props.offset,
      collision: this.props.collision,
    })
    Object.assign(this._surfaceRect, {
      x: position.x,
      y: position.y,
      width: this.props.width,
      height: this.props.height,
    })
    const padding = resolveSpacing(this.props.padding)
    Object.assign(this._bodyRect, {
      x: this._surfaceRect.x + padding.left,
      y: this._surfaceRect.y + padding.top,
      width: Math.max(0, this._surfaceRect.width - padding.left - padding.right),
      height: Math.max(0, this._surfaceRect.height - padding.top - padding.bottom),
    })
  }

  /** Нормализует anchor в систему координат Root. */
  private _normalizeAnchor(anchor: NovaUiOverlayAnchor): NovaUiOverlayAnchor {
    if (anchor.kind === 'root') {
      return { kind: 'root' }
    }
    return anchor
  }
}
