import { reconcileNovaTemplateChildren, type NovaApp, type NovaNode, type NovaSchema, type NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import { DIALOG_NODE_DESCRIPTOR, normalizeDialogProps, type DialogDescriptor } from '@/components/Dialog/dialog.config'
import type { DialogApi, DialogProps, DialogResolvedProps, DialogSchema } from '@/components/Dialog/dialog.types'
import { NovaUiComponentNode, buildBoxSchema, clamp, resolveComponentTextStyle , pushText } from '@/shared/component'
import { applyNodeLayoutRect, createLayoutRect, resolveSpacing } from '@/shared/layout'
import { resolveNovaUiOverlayPosition } from '@/shared/overlay/overlay-position'

export class Dialog<E extends EventList = Record<string, any>> extends NovaUiComponentNode<DialogResolvedProps, DialogApi, DialogProps, E> {
  private readonly bodyNodes: Array<NovaNode<E>> = []
  private readonly surfaceRect = createLayoutRect()
  private readonly bodyRect = createLayoutRect()
  private dragging = false
  private resizing = false
  private readonly api: DialogApi

  constructor(app: NovaApp<E>, surface: NovaSurface<E>, props: DialogProps = {}, options: { componentId?: string; children?: DialogSchema['children'] } = {}, descriptor: DialogDescriptor = DIALOG_NODE_DESCRIPTOR) {
    super(app, surface, descriptor, normalizeDialogProps(props), options)
    this.api = { open: event => this.setOpen(true, event), close: event => this.setOpen(false, event), toggle: event => this.setOpen(!this.props.open, event), moveTo: (x, y, event) => this.moveTo(x, y, event), resizeTo: (width, height, event) => this.resizeTo(width, height, event), setProps: patch => this.setProps(patch), getProps: () => this.props }
    reconcileNovaTemplateChildren(this, this.bodyNodes, options.children ?? []).nodes.forEach(node => this.bodyNodes.push(node))
    this.applyOpenState()
    this.applyBodyOpenState()
    this.setupEvents()
  }

  override setProps(patch: DialogProps): this { return super.setProps(patch as Partial<DialogResolvedProps>) }
  override getApi(): DialogApi { return this.api }

  update(): void {
    this.applyBodyOpenState()
    if (!this.props.open) return
    this.resolveRects()
    for (const child of this.bodyNodes) applyNodeLayoutRect(child as NovaNode<any>, this.bodyRect)
  }

  render(): void {
    if (!this.props.open) { this.renderer.schema([]); return }
    this.resolveRects()
    const schema: NovaSchema = []
    if (this.props.modal || this.props.backdrop) schema.push({ type: 'rect', x: 0, y: 0, width: this.width, height: this.height, styles: { background: 'rgba(15,23,42,0.38)' } })
    const surface = buildBoxSchema(this.props, this.surfaceRect.width, this.surfaceRect.height)
    for (const item of surface) { const shape = item as Record<string, any>; shape.x = (shape.x ?? 0) + this.surfaceRect.x; shape.y = (shape.y ?? 0) + this.surfaceRect.y; schema.push(item) }
    const padding = resolveSpacing(this.props.padding)
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
    pushText(schema, this.props.title, this.surfaceRect.x + padding.left, this.surfaceRect.y + padding.top, this.surfaceRect.width - padding.left - padding.right - 32, 24, { ...textStyle, fontSize: 17, fontWeight: '800', lineHeight: 22 })
    pushText(schema, this.props.description, this.surfaceRect.x + padding.left, this.surfaceRect.y + padding.top + 24, this.surfaceRect.width - padding.left - padding.right - 32, 20, { ...textStyle, color: '#64748b', fontSize: 12, lineHeight: 17 })
    if (this.props.closeButton) pushText(schema, '×', this.surfaceRect.x + this.surfaceRect.width - padding.right - 24, this.surfaceRect.y + padding.top, 24, 24, { ...textStyle, fontSize: 20, fontWeight: '700' }, { align: 'center' })
    if (this.props.draggable) schema.push({ type: 'rect', x: this.surfaceRect.x + 12, y: this.surfaceRect.y + 6, width: this.surfaceRect.width - 24, height: 4, styles: { background: 'rgba(148,163,184,0.42)', border: { color: 'rgba(0,0,0,0)', width: 0, radius: 999 } } })
    if (this.props.resizable) schema.push({ type: 'rect', x: this.surfaceRect.x + this.surfaceRect.width - 18, y: this.surfaceRect.y + this.surfaceRect.height - 18, width: 12, height: 12, styles: { background: 'rgba(100,116,139,0.45)' } })
    this.renderer.schema(schema)
  }

  protected override onPropsChanged(changedKeys: Array<keyof DialogResolvedProps>): void { this.props = normalizeDialogProps(this.props); this.applyCommonPropsChanged(changedKeys); if (changedKeys.includes('open') || changedKeys.includes('display')) { this.applyOpenState(); this.applyBodyOpenState() } }

  private setOpen(open: boolean, event?: Event): void { if (open !== this.props.open) { this.setProps({ open }); this.props.onOpenChange?.(open, event) } }
  private moveTo(x: number, y: number, event?: Event): void { const next = { x: clamp(x, 0, Math.max(0, this.width - this.props.width)), y: clamp(y, 0, Math.max(0, this.height - this.props.height)) }; this.setProps({ position: next }); this.props.onMove?.(next, event) }
  private resizeTo(width: number, height: number, event?: Event): void { const next = { width: clamp(width, this.props.minWidth, Math.min(this.width, this.props.maxWidth)), height: clamp(height, this.props.minHeight, Math.min(this.height, this.props.maxHeight)) }; this.setProps(next); this.props.onResize?.(next, event) }
  private setupEvents(): void {
    this.on('mousedown', event => { const { x, y } = this.events.getCanvasMousePosition(event); const [localX, localY] = this.toLocal(x, y); if (this.props.closeButton && localX >= this.surfaceRect.x + this.surfaceRect.width - 44 && localY <= this.surfaceRect.y + 44) { this.setOpen(false, event); return false } if (this.props.resizable && localX >= this.surfaceRect.x + this.surfaceRect.width - 24 && localY >= this.surfaceRect.y + this.surfaceRect.height - 24) { this.resizing = true; return false } if (this.props.draggable && localY <= this.surfaceRect.y + 48) { this.dragging = true; return false } if (this.props.dismiss.outside && (localX < this.surfaceRect.x || localX > this.surfaceRect.x + this.surfaceRect.width || localY < this.surfaceRect.y || localY > this.surfaceRect.y + this.surfaceRect.height)) this.setOpen(false, event); return false })
    this.on('dragmove', (event, dx, dy) => { if (this.dragging) { this.moveTo(this.surfaceRect.x + dx, this.surfaceRect.y + dy, event); return false } if (this.resizing) { this.resizeTo(this.props.width + dx, this.props.height + dy, event); return false } })
    this.on('dragend', () => { this.dragging = false; this.resizing = false; return false })
    this.on('keydown', event => { if (this.props.open && this.props.dismiss.escape && event.key === 'Escape') this.setOpen(false, event) })
  }
  private applyOpenState(): void {
    const displayed = this.props.display !== 'none' && this.props.open
    this.visible = displayed
    this.active = displayed
    this.options({ interactive: displayed })
  }
  private applyBodyOpenState(): void {
    const displayed = this.props.display !== 'none' && this.props.open
    for (const node of this.bodyNodes) {
      node.visible = displayed
      node.active = displayed
      node.dirty({ update: true, render: true })
    }
  }
  private resolveRects(): void {
    const width = this.props.width * this.props.scale
    const height = this.props.height * this.props.scale
    const pos = this.props.position?.x !== undefined || this.props.position?.y !== undefined ? { x: this.props.position?.x ?? 0, y: this.props.position?.y ?? 0 } : resolveNovaUiOverlayPosition({ root: { x: 0, y: 0, width: this.width, height: this.height }, overlay: { width, height }, placement: this.props.placement, collision: { mode: 'clamp', padding: 16 } })
    Object.assign(this.surfaceRect, { x: clamp(pos.x, 0, Math.max(0, this.width - width)), y: clamp(pos.y, 0, Math.max(0, this.height - height)), width, height })
    const padding = resolveSpacing(this.props.padding); Object.assign(this.bodyRect, { x: this.surfaceRect.x + padding.left, y: this.surfaceRect.y + padding.top + 56, width: Math.max(0, this.surfaceRect.width - padding.left - padding.right), height: Math.max(0, this.surfaceRect.height - padding.top - padding.bottom - 56) })
  }
}
