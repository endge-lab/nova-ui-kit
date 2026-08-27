import type { NovaApp, NovaNode, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { PopoverDescriptor } from '@/components/Popover/popover.config'
import type {
  PopoverApi,
  PopoverProps,
  PopoverResolvedProps,
  PopoverSchema,
} from '@/components/Popover/popover.types'
import { reconcileNovaTemplateChildren } from '@endge/nova'
import {
  normalizePopoverProps,
  POPOVER_NODE_DESCRIPTOR,
} from '@/components/Popover/popover.config'
import { buildBoxSchema, NovaUiComponentNode } from '@/shared/component'
import { applyNodeLayoutRect, createLayoutRect } from '@/shared/layout'
import { resolveNovaUiOverlayPosition } from '@/shared/overlay/overlay-position'

export class Popover<
  E extends EventList = Record<string, any>,
> extends NovaUiComponentNode<
    PopoverResolvedProps,
    PopoverApi,
    PopoverProps,
    E
  > {
  private readonly _childNodes: Array<NovaNode<E>> = []
  private readonly _surfaceRect = createLayoutRect()
  private readonly _api: PopoverApi

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: PopoverProps = {},
    options: {
      componentId?: string
      children?: PopoverSchema['children']
    } = {},
    descriptor: PopoverDescriptor = POPOVER_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizePopoverProps(props), options)
    this._api = {
      open: event => this._setOpen(true, event),
      close: event => this._setOpen(false, event),
      toggle: event => this._setOpen(!this.props.open, event),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    reconcileNovaTemplateChildren(
      this,
      this._childNodes,
      options.children ?? [],
    ).nodes.forEach(node => this._childNodes.push(node))
    this._syncOpenState()
    this._setupEvents()
  }

  override setProps(patch: PopoverProps): this {
    return super.setProps(patch as Partial<PopoverResolvedProps>)
  }

  override getApi(): PopoverApi {
    return this._api
  }

  update(): void {
    this._resolveRect()
    for (const child of this._childNodes) {
      applyNodeLayoutRect(child as NovaNode<any>, this._surfaceRect)
    }
  }

  render(): void {
    if (!this.props.open) {
      this.renderer.schema([])
      return
    }
    this._resolveRect()
    const schema: NovaSchema = []
    if (this.props.backdrop) {
      schema.push({
        type: 'rect',
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        styles: {
          background: this.resolveThemeValue(
            'var(--nova-popover-backdrop-background, rgba(15,23,42,0.18))',
          ),
        },
      })
    }
    const surface = buildBoxSchema(
      { ...this.props, ...(this.props.surface ?? {}) },
      this.props.width,
      this.props.height,
      { resolveThemeValue: value => this.resolveThemeValue(value) },
    )
    for (const item of surface) {
      const shape = item as Record<string, any>
      shape.x = (shape.x ?? 0) + this._surfaceRect.x
      shape.y = (shape.y ?? 0) + this._surfaceRect.y
      schema.push(item)
    }
    if (this.props.arrow) {
      schema.push({
        type: 'rect',
        x: this._surfaceRect.x + 20,
        y: this._surfaceRect.y - 5,
        width: 10,
        height: 10,
        styles: {
          background: this.resolveThemeValue(
            'var(--nova-popover-arrow-background, #ffffff)',
          ),
          border: { color: 'rgba(0,0,0,0)', width: 0, radius: 2 },
        },
      })
    }
    this.renderer.schema(schema)
  }

  protected override onPropsChanged(
    changedKeys: Array<keyof PopoverResolvedProps>,
  ): void {
    this.props = normalizePopoverProps(this.props)
    this.applyCommonPropsChanged(changedKeys)
    this._syncOpenState()
  }

  protected override applyCommonDisplayState(): void {
    const displayed = this.props.display !== 'none' && this.props.open
    this.visible = displayed
    this.active = displayed
  }

  private _setOpen(open: boolean, event?: Event): void {
    if (open !== this.props.open) {
      this.setProps({ open })
      this.props.onOpenChange?.(open, event)
    }
  }

  private _syncOpenState(): void {
    this.options({
      interactive:
        this.props.open
        && !this.props.disabled
        && this.props.display !== 'none',
    })
  }

  private _setupEvents(): void {
    this.onCapture('mousedown', event => this._dismissOutside(event))
    this.on('mousedown', event => this._dismissOutside(event))
    this.on('click', event => this._dismissOutside(event))
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

  private _dismissOutside(event: MouseEvent): boolean | undefined {
    if (!this.props.open || !this.props.dismiss.outside) {
      return undefined
    }
    if (this._isInsideSurface(event)) {
      return undefined
    }
    this._setOpen(false, event)
    event.stopPropagation()
    return false
  }

  private _isInsideSurface(event: MouseEvent): boolean {
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    return (
      localX >= this._surfaceRect.x
      && localX <= this._surfaceRect.x + this._surfaceRect.width
      && localY >= this._surfaceRect.y
      && localY <= this._surfaceRect.y + this._surfaceRect.height
    )
  }

  private _resolveRect(): void {
    const pos = resolveNovaUiOverlayPosition({
      root: { x: 0, y: 0, width: this.width, height: this.height },
      anchor: this.props.anchor,
      overlay: { width: this.props.width, height: this.props.height },
      placement: this.props.placement,
      offset: this.props.offset,
      collision: this.props.collision,
    })
    Object.assign(this._surfaceRect, {
      x: pos.x,
      y: pos.y,
      width: this.props.width,
      height: this.props.height,
    })
  }
}
