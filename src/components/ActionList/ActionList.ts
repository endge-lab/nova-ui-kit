import type { EventList } from '@endge/utils'
import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import { ACTION_LIST_NODE_DESCRIPTOR, normalizeActionListProps, type ActionListDescriptor } from '@/components/ActionList/action-list.config'
import type { ActionListApi, ActionListItem, ActionListProps, ActionListResolvedProps } from '@/components/ActionList/action-list.types'
import { NovaUiComponentNode, buildBoxSchema, resolveComponentTextStyle , pushIcon, pushText } from '@/shared/component'
import { resolveSpacing } from '@/shared/layout'

export class ActionList<E extends EventList = Record<string, any>> extends NovaUiComponentNode<ActionListResolvedProps, ActionListApi, ActionListProps, E> {
  private hoveredIndex = -1
  private readonly api: ActionListApi
  constructor(app: NovaApp<E>, surface: NovaSurface<E>, props: ActionListProps = {}, options: { componentId?: string } = {}, descriptor: ActionListDescriptor = ACTION_LIST_NODE_DESCRIPTOR) {
    super(app, surface, descriptor, normalizeActionListProps(props), options)
    this.api = { setProps: patch => this.setProps(patch), setItems: items => this.setProps({ items }), setValue: (value, event) => this.setValue(value, event), focusNext: event => this.moveFocus(1, event), focusPrevious: event => this.moveFocus(-1, event), activateFocused: event => this.activateFocused(event), getProps: () => this.props }
    this.options({ interactive: !this.props.disabled })
    this.setupEvents()
  }
  override setProps(patch: ActionListProps): this { return super.setProps(patch as Partial<ActionListResolvedProps>) }
  override getApi(): ActionListApi { return this.api }
  render(): void {
    const schema: NovaSchema = buildBoxSchema(this.props, this.width, this.height)
    const padding = resolveSpacing(this.props.padding)
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
    let y = padding.top
    const width = Math.max(0, this.width - padding.left - padding.right)
    this.props.items.forEach((item, index) => {
      if (item.type === 'separator') { schema.push({ type: 'rect', x: padding.left + 8, y: y + 6, width: width - 16, height: 1, styles: { background: 'var(--nova-action-list-separator-color, #e2e8f0)' } }); y += 12; return }
      if (item.type === 'group') { pushText(schema, item.label, padding.left + 10, y, width - 20, 22, { ...textStyle, color: 'var(--nova-action-list-group-color, #64748b)', fontSize: 11, fontWeight: '700', lineHeight: 16 }); y += 24; return }
      const active = index === this.hoveredIndex || index === this.props.activeIndex || item.selected || this.itemValue(item) === this.props.value
      if (active) schema.push({ type: 'rect', x: padding.left, y, width, height: this.props.itemHeight, styles: { background: 'var(--nova-action-list-item-active-background, #eff6ff)', border: { color: 'rgba(0,0,0,0)', width: 0, radius: 6 } } })
      pushIcon(schema, item.icon, padding.left + 10, y + (this.props.itemHeight - 16) / 2, 16, item.disabled ? 0.45 : 1)
      const textX = padding.left + (item.icon ? 34 : 10)
      pushText(schema, item.label, textX, y + 2, width - 82, 20, { ...textStyle, color: item.disabled ? 'var(--nova-action-list-disabled-color, #94a3b8)' : item.tone === 'danger' ? 'var(--nova-action-list-danger-color, #dc2626)' : textStyle.color, fontWeight: item.selected ? '700' : textStyle.fontWeight })
      if (item.description) pushText(schema, item.description, textX, y + 20, width - 82, 16, { ...textStyle, color: 'var(--nova-action-list-description-color, #64748b)', fontSize: 11, lineHeight: 14 })
      pushText(schema, item.shortcut, padding.left + width - 56, y + 2, 46, 20, { ...textStyle, color: 'var(--nova-action-list-shortcut-color, #94a3b8)', fontSize: 11, lineHeight: 16 }, { align: 'right' })
      if (item.checked || this.itemValue(item) === this.props.value) pushText(schema, '✓', padding.left + width - 21, y + 2, 16, 20, { ...textStyle, color: 'var(--nova-action-list-checkmark-color, #2563eb)', fontWeight: '800' }, { align: 'center' })
      else if (item.type === 'submenu' || item.items?.length) pushText(schema, '›', padding.left + width - 20, y + 2, 16, 20, { ...textStyle, color: 'var(--nova-action-list-submenu-color, #64748b)', fontWeight: '800' }, { align: 'center' })
      y += this.props.itemHeight
    })
    this.renderer.schema(schema)
  }
  protected override onPropsChanged(changedKeys: Array<keyof ActionListResolvedProps>): void { this.props = normalizeActionListProps(this.props); this.options({ interactive: !this.props.disabled }); this.applyCommonPropsChanged(changedKeys) }
  private setupEvents(): void {
    this.on('mousemove', event => { const index = this.indexFromEvent(event); if (index !== this.hoveredIndex) { this.hoveredIndex = index; this.dirty({ render: true }) } })
    this.on('click', event => { const index = this.indexFromEvent(event); if (index >= 0) this.activate(index, event); return false })
    this.on('keydown', event => { if (event.key === 'ArrowDown') this.moveFocus(1, event); else if (event.key === 'ArrowUp') this.moveFocus(-1, event); else if (event.key === 'Enter' || event.key === ' ') this.activateFocused(event) })
  }
  private setValue(value: string | number | boolean | undefined, event?: Event): void { const item = this.props.items[this.props.activeIndex]; this.setProps({ value }); if (item) this.props.onValueChange?.(value, item, event) }
  private moveFocus(delta: number, _event?: Event): void { const indexes = this.props.items.map((item, index) => ({ item, index })).filter(({ item }) => item.type !== 'separator' && item.type !== 'group' && !item.disabled).map(({ index }) => index); if (!indexes.length) return; const current = Math.max(0, indexes.indexOf(this.props.activeIndex)); this.setProps({ activeIndex: indexes[this.props.loop ? (current + delta + indexes.length) % indexes.length : Math.max(0, Math.min(indexes.length - 1, current + delta))] }) }
  private activateFocused(event?: Event): void { this.activate(this.props.activeIndex, event) }
  private activate(index: number, event?: Event): void { const item = this.props.items[index]; if (!item || item.disabled || item.type === 'separator' || item.type === 'group') return; this.setProps({ activeIndex: index }); if (this.props.selectable) this.setValue(this.itemValue(item), event); this.props.onAction?.(item, index, event) }
  private itemValue(item: ActionListItem): string | number | boolean | undefined { return item.value ?? item.id ?? item.label }
  private indexFromEvent(event: MouseEvent): number { const { x, y } = this.events.getCanvasMousePosition(event); const [, localY] = this.toLocal(x, y); const padding = resolveSpacing(this.props.padding); let rowY = padding.top; for (let index = 0; index < this.props.items.length; index += 1) { const item = this.props.items[index]; const height = item.type === 'separator' ? 12 : item.type === 'group' ? 24 : this.props.itemHeight; if (localY >= rowY && localY <= rowY + height) return item.disabled || item.type === 'separator' || item.type === 'group' ? -1 : index; rowY += height } return -1 }
}
