import { reconcileNovaTemplateChildren, type NovaApp, type NovaNode, type NovaSchema, type NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import { TOAST_NODE_DESCRIPTOR, TOAST_REGION_NODE_DESCRIPTOR, normalizeToastProps, normalizeToastRegionProps, type ToastDescriptor, type ToastRegionDescriptor } from '@/components/Toast/toast.config'
import { TOAST_SCHEMA_TYPE, type ToastApi, type ToastItem, type ToastProps, type ToastRegionApi, type ToastRegionProps, type ToastRegionResolvedProps, type ToastResolvedProps } from '@/components/Toast/toast.types'
import { NovaUiComponentNode, buildBoxSchema, resolveComponentTextStyle , pushIcon, pushText } from '@/shared/component'
import { applyNodeLayoutRect } from '@/shared/layout'

export class Toast<E extends EventList = Record<string, any>> extends NovaUiComponentNode<ToastResolvedProps, ToastApi, ToastProps, E> {
  private readonly api: ToastApi
  constructor(app: NovaApp<E>, surface: NovaSurface<E>, props: ToastProps = {}, options: { componentId?: string } = {}, descriptor: ToastDescriptor = TOAST_NODE_DESCRIPTOR) {
    super(app, surface, descriptor, normalizeToastProps(props), options)
    this.api = { close: event => this.props.onClose?.(event), action: event => this.props.onAction?.(event), setProps: patch => this.setProps(patch), getProps: () => this.props }
    this.options({ interactive: true })
    this.on('click', event => { this.props.onClose?.(event); return false })
  }
  override setProps(patch: ToastProps): this { return super.setProps(patch as Partial<ToastResolvedProps>) }
  override getApi(): ToastApi { return this.api }
  render(): void {
    const schema: NovaSchema = buildBoxSchema(this.props, this.width, this.height)
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
    const left = this.props.icon ? 44 : 14
    pushIcon(schema, this.props.icon, 14, 16, 20)
    pushText(schema, this.props.title, left, 11, this.width - left - 42, 22, { ...textStyle, fontWeight: '800', lineHeight: 20 })
    pushText(schema, this.props.message, left, 34, this.width - left - 42, 20, { ...textStyle, color: 'var(--nova-toast-message-color, #64748b)', fontSize: 12, lineHeight: 17 })
    pushText(schema, this.props.actionLabel, left, this.height - 25, 90, 20, { ...textStyle, color: 'var(--nova-toast-action-color, #2563eb)', fontWeight: '700', fontSize: 12 })
    if (this.props.closeButton) pushText(schema, '×', this.width - 32, 8, 20, 20, { ...textStyle, fontSize: 19, fontWeight: '700' }, { align: 'center' })
    if (this.props.progress !== undefined) schema.push({ type: 'rect', x: 0, y: this.height - 3, width: this.width * this.props.progress, height: 3, styles: { background: 'var(--nova-toast-progress-background, #2563eb)' } })
    this.renderer.schema(schema)
  }
  protected override onPropsChanged(changedKeys: Array<keyof ToastResolvedProps>): void { this.props = normalizeToastProps(this.props); this.applyCommonPropsChanged(changedKeys) }
}

export class ToastRegion<E extends EventList = Record<string, any>> extends NovaUiComponentNode<ToastRegionResolvedProps, ToastRegionApi, ToastRegionProps, E> {
  private readonly toastNodes: Array<NovaNode<E>> = []
  private readonly timers = new Map<string, number>()
  private readonly api: ToastRegionApi
  constructor(app: NovaApp<E>, surface: NovaSurface<E>, props: ToastRegionProps = {}, options: { componentId?: string } = {}, descriptor: ToastRegionDescriptor = TOAST_REGION_NODE_DESCRIPTOR) {
    super(app, surface, descriptor, normalizeToastRegionProps(props), options)
    this.api = { push: item => this.setProps({ items: [item, ...this.props.items] }), dismiss: (id, event) => this.dismiss(id, event), clear: () => this.clear(), setProps: patch => this.setProps(patch), getProps: () => this.props }
    this.reconcileToasts()
  }
  override setProps(patch: ToastRegionProps): this { return super.setProps(patch as Partial<ToastRegionResolvedProps>) }
  override getApi(): ToastRegionApi { return this.api }
  update(): void { this.visibleItems().forEach((_item, index) => { const node = this.toastNodes[index]; if (node) applyNodeLayoutRect(node as NovaNode<any>, { x: this.resolveX(), y: this.resolveY(index), width: 320, height: 84 }) }) }
  render(): void { this.renderer.schema(buildBoxSchema(this.props, this.width, this.height)) }
  protected override onPropsChanged(changedKeys: Array<keyof ToastRegionResolvedProps>): void { this.props = normalizeToastRegionProps(this.props); if (changedKeys.includes('items')) this.reconcileToasts(); this.applyCommonPropsChanged(changedKeys) }
  private reconcileToasts(): void {
    const schemas = this.visibleItems().map(item => ({ type: TOAST_SCHEMA_TYPE, id: item.id, props: { title: item.title, message: item.message, icon: item.icon, tone: item.tone, actionLabel: item.actionLabel, onClose: (event?: Event) => this.dismiss(item.id, event), onAction: (event?: Event) => this.props.onAction?.(item, event) } }))
    const reconciled = reconcileNovaTemplateChildren(this, this.toastNodes, schemas)
    this.toastNodes.length = 0; this.toastNodes.push(...reconciled.nodes); this.syncTimers()
  }
  private syncTimers(): void { if (!this.props.autoDismiss) return; for (const item of this.visibleItems()) if (!this.timers.has(item.id) && (item.duration ?? 4500) > 0) this.timers.set(item.id, window.setTimeout(() => this.dismiss(item.id), item.duration ?? 4500)) }
  private dismiss(id: string, event?: Event): void { const item = this.props.items.find(current => current.id === id); if (!item) return; const timer = this.timers.get(id); if (timer) window.clearTimeout(timer); this.timers.delete(id); this.setProps({ items: this.props.items.filter(current => current.id !== id) }); this.props.onDismiss?.(item, event) }
  private clear(): void { for (const timer of this.timers.values()) window.clearTimeout(timer); this.timers.clear(); this.setProps({ items: [] }) }
  private visibleItems(): Array<ToastItem> { const items = this.props.newestFirst ? this.props.items : [...this.props.items].reverse(); return items.slice(0, this.props.limit) }
  private resolveX(): number { return this.props.placement.endsWith('left') ? 0 : this.props.placement.endsWith('right') ? Math.max(0, this.width - 320) : Math.max(0, (this.width - 320) / 2) }
  private resolveY(index: number): number { return this.props.placement.startsWith('top') ? index * (84 + this.props.gap) : Math.max(0, this.height - (index + 1) * 84 - index * this.props.gap) }
}
