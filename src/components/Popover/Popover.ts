import { reconcileNovaTemplateChildren, type NovaApp, type NovaNode, type NovaSchema, type NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import { POPOVER_NODE_DESCRIPTOR, normalizePopoverProps, type PopoverDescriptor } from '@/components/Popover/popover.config'
import type { PopoverApi, PopoverProps, PopoverResolvedProps, PopoverSchema } from '@/components/Popover/popover.types'
import { NovaUiComponentNode, buildBoxSchema } from '@/shared/component'
import { applyNodeLayoutRect, createLayoutRect } from '@/shared/layout'
import { resolveNovaUiOverlayPosition } from '@/shared/overlay/overlay-position'

export class Popover<E extends EventList = Record<string, any>> extends NovaUiComponentNode<PopoverResolvedProps, PopoverApi, PopoverProps, E> {
  private readonly childNodes: Array<NovaNode<E>> = []
  private readonly surfaceRect = createLayoutRect()
  private readonly api: PopoverApi

  constructor(app: NovaApp<E>, surface: NovaSurface<E>, props: PopoverProps = {}, options: { componentId?: string; children?: PopoverSchema['children'] } = {}, descriptor: PopoverDescriptor = POPOVER_NODE_DESCRIPTOR) {
    super(app, surface, descriptor, normalizePopoverProps(props), options)
    this.api = { open: event => this.setOpen(true, event), close: event => this.setOpen(false, event), toggle: event => this.setOpen(!this.props.open, event), setProps: patch => this.setProps(patch), getProps: () => this.props }
    reconcileNovaTemplateChildren(this, this.childNodes, options.children ?? []).nodes.forEach(node => this.childNodes.push(node))
    this.syncOpenState()
    this.setupEvents()
  }

  override setProps(patch: PopoverProps): this { return super.setProps(patch as Partial<PopoverResolvedProps>) }
  override getApi(): PopoverApi { return this.api }

  update(): void {
    this.resolveRect()
    for (const child of this.childNodes) applyNodeLayoutRect(child as NovaNode<any>, this.surfaceRect)
  }

  render(): void {
    if (!this.props.open) { this.renderer.schema([]); return }
    this.resolveRect()
    const schema: NovaSchema = []
    if (this.props.backdrop) schema.push({ type: 'rect', x: 0, y: 0, width: this.width, height: this.height, styles: { background: 'var(--nova-popover-backdrop-background, rgba(15,23,42,0.18))' } })
    const surface = buildBoxSchema({ ...this.props, ...(this.props.surface ?? {}) }, this.props.width, this.props.height)
    for (const item of surface) { const shape = item as Record<string, any>; shape.x = (shape.x ?? 0) + this.surfaceRect.x; shape.y = (shape.y ?? 0) + this.surfaceRect.y; schema.push(item) }
    if (this.props.arrow) schema.push({ type: 'rect', x: this.surfaceRect.x + 20, y: this.surfaceRect.y - 5, width: 10, height: 10, styles: { background: 'var(--nova-popover-arrow-background, #ffffff)', border: { color: 'rgba(0,0,0,0)', width: 0, radius: 2 } } })
    this.renderer.schema(schema)
  }

  protected override onPropsChanged(changedKeys: Array<keyof PopoverResolvedProps>): void { this.props = normalizePopoverProps(this.props); this.applyCommonPropsChanged(changedKeys); this.syncOpenState() }

  protected override applyCommonDisplayState(): void {
    const displayed = this.props.display !== 'none' && this.props.open
    this.visible = displayed
    this.active = displayed
  }

  private setOpen(open: boolean, event?: Event): void { if (open !== this.props.open) { this.setProps({ open }); this.props.onOpenChange?.(open, event) } }
  private syncOpenState(): void { this.options({ interactive: this.props.open && !this.props.disabled && this.props.display !== 'none' }) }
  private setupEvents(): void {
    this.on('click', event => { if (!this.props.open || !this.props.dismiss.outside) return; const { x, y } = this.events.getCanvasMousePosition(event); const [localX, localY] = this.toLocal(x, y); if (localX < this.surfaceRect.x || localX > this.surfaceRect.x + this.surfaceRect.width || localY < this.surfaceRect.y || localY > this.surfaceRect.y + this.surfaceRect.height) this.setOpen(false, event); return false })
    this.on('keydown', event => { if (this.props.open && this.props.dismiss.escape && event.key === 'Escape') this.setOpen(false, event) })
  }
  private resolveRect(): void {
    const pos = resolveNovaUiOverlayPosition({ root: { x: 0, y: 0, width: this.width, height: this.height }, anchor: this.props.anchor, overlay: { width: this.props.width, height: this.props.height }, placement: this.props.placement, offset: this.props.offset, collision: this.props.collision })
    Object.assign(this.surfaceRect, { x: pos.x, y: pos.y, width: this.props.width, height: this.props.height })
  }
}
