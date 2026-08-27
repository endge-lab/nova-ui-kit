import type {
  NovaApp,
  NovaElementSchema,
  NovaNode,
  NovaSchema,
  NovaSurface,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { DialogDescriptor } from '@/components/Dialog/dialog.config'
import type {
  DialogApi,
  DialogProps,
  DialogResolvedProps,
  DialogSchema,
} from '@/components/Dialog/dialog.types'
import type { NovaUiLayoutRect, NovaUiLayoutTarget } from '@/shared/layout'
import { reconcileNovaTemplateChildren } from '@endge/nova'
import {
  DIALOG_NODE_DESCRIPTOR,
  normalizeDialogProps,
} from '@/components/Dialog/dialog.config'
import {
  buildBoxSchema,
  clamp,
  NovaUiComponentNode,
  pushText,
  resolveComponentTextStyle,
} from '@/shared/component'
import {
  applyNodeLayoutRect,
  createLayoutRect,
  NOVA_UI_LAYOUT_TARGET,
  resolveSpacing,
} from '@/shared/layout'
import { resolveNovaUiOverlayPosition } from '@/shared/overlay/overlay-position'

export class Dialog<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<DialogResolvedProps, DialogApi, DialogProps, E>
  implements NovaUiLayoutTarget {
  readonly [NOVA_UI_LAYOUT_TARGET] = true as const

  private readonly _bodyNodes: Array<NovaNode<E>> = []
  private readonly _surfaceRect = createLayoutRect()
  private readonly _bodyRect = createLayoutRect()
  private _dragging = false
  private _resizing = false
  private _bodyLayoutReady = false
  private readonly _api: DialogApi
  private readonly _renderBackdrop: boolean

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: DialogProps = {},
    options: {
      componentId?: string
      children?: DialogSchema['children']
      renderBackdrop?: boolean
    } = {},
    descriptor: DialogDescriptor = DIALOG_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeDialogProps(props), options)
    this._renderBackdrop = options.renderBackdrop ?? true
    this._api = {
      open: event => this._setOpen(true, event),
      close: event => this._setOpen(false, event),
      toggle: event => this._setOpen(!this.props.open, event),
      moveTo: (x, y, event) => this._moveTo(x, y, event),
      resizeTo: (width, height, event) => this._resizeTo(width, height, event),
      setProps: patch => this.setProps(patch),
      setChildren: children => this.setChildren(children),
      getProps: () => this.props,
    }
    this.setChildren(options.children ?? [])
    this._applyOpenState()
    this._applyBodyOpenState()
    this._setupEvents()
  }

  override setProps(patch: DialogProps): this {
    return super.setProps(patch as Partial<DialogResolvedProps>)
  }

  override getApi(): DialogApi {
    return this._api
  }

  setChildren(children: Array<NovaElementSchema<any>>): void {
    const reconciled = reconcileNovaTemplateChildren(
      this,
      this._bodyNodes,
      children,
    )
    this._bodyNodes.length = 0
    this._bodyNodes.push(...reconciled.nodes)

    if (this.props.open && this.props.display !== 'none') {
      this._syncBodyLayout()
    }
    else {
      this._bodyLayoutReady = false
      this._applyBodyOpenState()
    }

    this.dirty({ update: true, render: true })
  }

  /** Принимает rect overlay root без перезаписи собственных width/height props диалога. */
  applyLayoutRect(rect: NovaUiLayoutRect): boolean {
    const changed
      = this.x !== rect.x
        || this.y !== rect.y
        || this.width !== rect.width
        || this.height !== rect.height

    this.options({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    })
    if (changed) {
      this.dirty({ matrix: true, update: true, render: true })
    }
    return changed
  }

  update(): void {
    if (!this.props.open) {
      this._bodyLayoutReady = false
      this._applyBodyOpenState()
      return
    }

    this._syncBodyLayout()
  }

  render(): void {
    if (!this.props.open) {
      this.renderer.schema([])
      return
    }
    this._resolveRects()
    const rootRect = this._resolveOverlayRootRect()
    const schema: NovaSchema = []
    if (this._renderBackdrop && this.props.backdrop) {
      schema.push({
        type: 'rect',
        x: 0,
        y: 0,
        width: rootRect.width,
        height: rootRect.height,
        styles: {
          background: this.resolveThemeValue(
            'var(--nova-dialog-backdrop-background, rgba(15,23,42,0.38))',
          ),
        },
      })
    }
    const surface = buildBoxSchema(
      this.props,
      this._surfaceRect.width,
      this._surfaceRect.height,
      { resolveThemeValue: value => this.resolveThemeValue(value) },
    )
    for (const item of surface) {
      const shape = item as Record<string, any>
      shape.x = (shape.x ?? 0) + this._surfaceRect.x
      shape.y = (shape.y ?? 0) + this._surfaceRect.y
      schema.push(item)
    }
    const padding = resolveSpacing(this.props.padding)
    const textStyle = resolveComponentTextStyle(
      this.props,
      this.inheritedStyleContext,
      {},
      value => this.resolveThemeValue(value),
    )
    pushText(
      schema,
      this.props.title,
      this._surfaceRect.x + padding.left,
      this._surfaceRect.y + padding.top,
      this._surfaceRect.width - padding.left - padding.right - 32,
      24,
      { ...textStyle, fontSize: 17, fontWeight: '800', lineHeight: 22 },
    )
    pushText(
      schema,
      this.props.description,
      this._surfaceRect.x + padding.left,
      this._surfaceRect.y + padding.top + 24,
      this._surfaceRect.width - padding.left - padding.right - 32,
      20,
      {
        ...textStyle,
        color:
          this.resolveThemeValue(
            'var(--nova-dialog-description-color, #64748b)',
          ) ?? textStyle.color,
        fontSize: 12,
        lineHeight: 17,
      },
    )
    if (this.props.closeButton) {
      pushText(
        schema,
        '×',
        this._surfaceRect.x + this._surfaceRect.width - padding.right - 24,
        this._surfaceRect.y + padding.top,
        24,
        24,
        { ...textStyle, fontSize: 20, fontWeight: '700' },
        { align: 'center' },
      )
    }
    if (this.props.draggable) {
      schema.push({
        type: 'rect',
        x: this._surfaceRect.x + 12,
        y: this._surfaceRect.y + 6,
        width: this._surfaceRect.width - 24,
        height: 4,
        styles: {
          background: this.resolveThemeValue(
            'var(--nova-dialog-handle-background, rgba(148,163,184,0.42))',
          ),
          border: { color: 'rgba(0,0,0,0)', width: 0, radius: 999 },
        },
      })
    }
    if (this.props.resizable) {
      schema.push({
        type: 'rect',
        x: this._surfaceRect.x + this._surfaceRect.width - 18,
        y: this._surfaceRect.y + this._surfaceRect.height - 18,
        width: 12,
        height: 12,
        styles: {
          background: this.resolveThemeValue(
            'var(--nova-dialog-resize-background, rgba(100,116,139,0.45))',
          ),
        },
      })
    }
    this.renderer.schema(schema)
  }

  protected override onPropsChanged(
    changedKeys: Array<keyof DialogResolvedProps>,
  ): void {
    this.props = normalizeDialogProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    if (changedKeys.includes('open') || changedKeys.includes('display')) {
      if (!this.props.open || this.props.display === 'none') {
        this._bodyLayoutReady = false
      }
      this._applyOpenState()
      this._applyBodyOpenState()
    }
    if (this.props.open && shouldSyncBodyLayout(changedKeys)) {
      this._syncBodyLayout()
    }
  }

  private _setOpen(open: boolean, event?: Event): void {
    if (open !== this.props.open) {
      this.setProps({ open })
      this.props.onOpenChange?.(open, event)
    }
  }

  private _moveTo(x: number, y: number, event?: Event): void {
    const rootRect = this._resolveOverlayRootRect()
    const next = {
      x: clamp(x, 0, Math.max(0, rootRect.width - this.props.width)),
      y: clamp(y, 0, Math.max(0, rootRect.height - this.props.height)),
    }
    this.setProps({ position: next })
    this.props.onMove?.(next, event)
  }

  private _resizeTo(width: number, height: number, event?: Event): void {
    const rootRect = this._resolveOverlayRootRect()
    const next = {
      width: clamp(
        width,
        this.props.minWidth,
        Math.min(rootRect.width, this.props.maxWidth),
      ),
      height: clamp(
        height,
        this.props.minHeight,
        Math.min(rootRect.height, this.props.maxHeight),
      ),
    }
    this.setProps(next)
    this.props.onResize?.(next, event)
  }

  private _setupEvents(): void {
    this.on('mousedown', (event) => {
      const { x, y } = this.events.getCanvasMousePosition(event)
      const [localX, localY] = this.toLocal(x, y)
      if (
        this.props.closeButton
        && localX >= this._surfaceRect.x + this._surfaceRect.width - 44
        && localY <= this._surfaceRect.y + 44
      ) {
        this._setOpen(false, event)
        return false
      }
      if (
        this.props.resizable
        && localX >= this._surfaceRect.x + this._surfaceRect.width - 24
        && localY >= this._surfaceRect.y + this._surfaceRect.height - 24
      ) {
        this._resizing = true
        return false
      }
      if (this.props.draggable && localY <= this._surfaceRect.y + 48) {
        this._dragging = true
        return false
      }
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
    this.on('dragmove', (event, dx, dy) => {
      if (this._dragging) {
        this._moveTo(this._surfaceRect.x + dx, this._surfaceRect.y + dy, event)
        return false
      }
      if (this._resizing) {
        this._resizeTo(this.props.width + dx, this.props.height + dy, event)
        return false
      }
    })
    this.on('dragend', () => {
      this._dragging = false
      this._resizing = false
      return false
    })
    this.on('keydown', (event) => {
      if (
        this.props.open
        && this.props.dismiss.escape
        && event.key === 'Escape'
      ) {
        this._setOpen(false, event)
      }
    })
  }

  private _applyOpenState(): void {
    const displayed = this.props.display !== 'none' && this.props.open
    this.visible = displayed
    this.active = displayed
    this.options({ interactive: displayed })
  }

  private _applyBodyOpenState(): void {
    const displayed
      = this.props.display !== 'none' && this.props.open && this._bodyLayoutReady
    for (const node of this._bodyNodes) {
      node.visible = displayed
      node.active = displayed
      node.dirty({ update: true, render: true })
    }
  }

  private _syncBodyLayout(): void {
    this._resolveRects()
    for (const child of this._bodyNodes) {
      applyNodeLayoutRect(child as NovaNode<any>, this._bodyRect)
    }
    this._bodyLayoutReady = true
    this._applyBodyOpenState()
  }

  private _resolveRects(): void {
    const rootRect = this._resolveOverlayRootRect()
    const width = this.props.width * this.props.scale
    const height = this.props.height * this.props.scale
    const pos
      = this.props.position?.x !== undefined
        || this.props.position?.y !== undefined
        ? { x: this.props.position?.x ?? 0, y: this.props.position?.y ?? 0 }
        : resolveNovaUiOverlayPosition({
            root: {
              x: 0,
              y: 0,
              width: rootRect.width,
              height: rootRect.height,
            },
            overlay: { width, height },
            placement: this.props.placement,
            collision: { mode: 'clamp', padding: 16 },
          })
    Object.assign(this._surfaceRect, {
      x: clamp(pos.x, 0, Math.max(0, rootRect.width - width)),
      y: clamp(pos.y, 0, Math.max(0, rootRect.height - height)),
      width,
      height,
    })
    const padding = resolveSpacing(this.props.padding)
    Object.assign(this._bodyRect, {
      x: this._surfaceRect.x + padding.left,
      y: this._surfaceRect.y + padding.top + 56,
      width: Math.max(
        0,
        this._surfaceRect.width - padding.left - padding.right,
      ),
      height: Math.max(
        0,
        this._surfaceRect.height - padding.top - padding.bottom - 56,
      ),
    })
  }

  private _resolveOverlayRootRect(): { width: number, height: number } {
    return {
      width: Math.max(this.width, this.surface.width),
      height: Math.max(this.height, this.surface.height),
    }
  }
}

function shouldSyncBodyLayout(
  changedKeys: Array<keyof DialogResolvedProps>,
): boolean {
  return (
    changedKeys.includes('position')
    || changedKeys.includes('placement')
    || changedKeys.includes('width')
    || changedKeys.includes('height')
    || changedKeys.includes('scale')
    || changedKeys.includes('padding')
    || changedKeys.includes('open')
    || changedKeys.includes('display')
  )
}
