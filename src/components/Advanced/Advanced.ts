import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  ADVANCED_COMPONENT_SCHEMA_TYPES,
  createAdvancedComponentDescriptor,
  normalizeAdvancedComponentProps,
  severityPalette,
  type AdvancedComponentDescriptor,
} from '@/components/Advanced/Advanced.config'
import type {
  AdvancedComponentApi,
  AdvancedComponentKind,
  AdvancedComponentProps,
  AdvancedComponentResolvedProps,
  AdvancedItem,
} from '@/components/Advanced/Advanced.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  clamp,
  resolveComponentTextStyle,
} from '@/shared/component/ComponentProps'
import { pushIcon, pushText } from '@/shared/component/ComponentRender'
import type { NovaUiPartStyle } from '@/domain/domain.types'

const TWO_PI = Math.PI * 2

/** Универсальный renderer для PrimeVue-inspired advanced primitives Nova UI Kit. */
export class AdvancedComponent<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<AdvancedComponentResolvedProps, AdvancedComponentApi, AdvancedComponentProps, E> {
  private hoveredIndex = -1
  private pressedIndex = -1
  private readonly api: AdvancedComponentApi

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    kind: AdvancedComponentKind,
    props: AdvancedComponentProps = {},
    options: { componentId?: string } = {},
    descriptor: AdvancedComponentDescriptor = createAdvancedComponentDescriptor(kind),
  ) {
    super(app, surface, descriptor, normalizeAdvancedComponentProps(kind, props), options)
    this.api = {
      setProps: patch => this.setProps(patch),
      setValue: (value, event) => this.setValue(value, event),
      setOpen: open => this.setProps({ open }),
      toggle: event => this.toggle(event),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setupEvents()
  }

  override setProps(patch: AdvancedComponentProps): this {
    return super.setProps(patch as Partial<AdvancedComponentResolvedProps>)
  }

  override getApi(): AdvancedComponentApi {
    return this.api
  }

  setValue(value: number | string | boolean, event?: Event): void {
    if (this.props.disabled) {
      this.playUiSound('disabledPress')
      return
    }
    this.setProps({ value })
    this.playUiSound('change')
    this.props.onChange?.(value, event)
  }

  toggle(event?: Event): void {
    if (this.props.kind === 'ToggleSwitch') {
      this.setProps({ checked: !this.props.checked, value: !this.props.checked })
      this.playUiSound('change')
      this.props.onChange?.(!this.props.checked, event)
      return
    }
    this.setProps({ open: !this.props.open, expanded: !this.props.expanded })
  }

  render(): void {
    const schema: NovaSchema = buildBoxSchema(this.props, this.width, this.height)

    switch (this.props.kind) {
      case 'SpeedDial':
        this.renderSpeedDial(schema)
        break
      case 'Dock':
        this.renderDock(schema)
        break
      case 'Carousel':
      case 'Galleria':
        this.renderGallery(schema)
        break
      case 'ImagePreview':
        this.renderImagePreview(schema)
        break
      case 'ImageCompare':
        this.renderImageCompare(schema)
        break
      case 'Skeleton':
        this.renderSkeleton(schema)
        break
      case 'ProgressBar':
        this.renderProgressBar(schema)
        break
      case 'ProgressSpinner':
        this.renderProgressSpinner(schema)
        break
      case 'MeterGroup':
        this.renderMeterGroup(schema)
        break
      case 'Knob':
        this.renderKnob(schema)
        break
      case 'ToggleSwitch':
        this.renderToggleSwitch(schema)
        break
      case 'RadioButton':
        this.renderRadioButton(schema)
        break
      case 'Rating':
        this.renderRating(schema)
        break
      case 'SelectButton':
        this.renderSelectButton(schema)
        break
      case 'Dialog':
      case 'Drawer':
      case 'Popover':
        this.renderOverlay(schema)
        break
      case 'Toast':
        this.renderToast(schema)
        break
      case 'Message':
        this.renderMessage(schema)
        break
      case 'BlockUI':
        this.renderBlockUi(schema)
        break
      case 'Accordion':
      case 'Fieldset':
        this.renderDisclosure(schema)
        break
      case 'Tabs':
        this.renderTabs(schema)
        break
      case 'Stepper':
        this.renderStepper(schema)
        break
    }

    this.renderer.schema(schema)
  }

  protected override onPropsChanged(changedKeys: Array<keyof AdvancedComponentResolvedProps>): void {
    this.props = normalizeAdvancedComponentProps(this.props.kind, this.props)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  private renderSpeedDial(schema: NovaSchema): void {
    const cx = this.width / 2
    const cy = this.height - 38
    const radius = Math.min(this.width, this.height) * 0.34
    const items = this.props.items

    items.forEach((item, index) => {
      const angle = -Math.PI + (index / Math.max(1, items.length - 1)) * (Math.PI * 0.75)
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius
      const active = index === this.hoveredIndex || index === this.pressedIndex
      this.pushRoundAction(schema, x - 18, y - 18, 36, item, active)
    })
    this.pushRoundAction(schema, cx - 24, cy - 24, 48, { label: '+', color: this.props.accentColor ?? '#2563eb' }, true)
  }

  private renderDock(schema: NovaSchema): void {
    const items = this.props.items
    const gap = 12
    const size = 42
    const total = items.length * size + Math.max(0, items.length - 1) * gap
    let x = (this.width - total) / 2

    items.forEach((item, index) => {
      const active = index === this.hoveredIndex
      const itemSize = active ? size + 10 : size
      this.pushRoundAction(schema, x - (itemSize - size) / 2, (this.height - itemSize) / 2, itemSize, item, active)
      x += size + gap
    })
  }

  private renderGallery(schema: NovaSchema): void {
    const items = this.props.items
    const active = items[Math.min(items.length - 1, this.props.activeIndex)] ?? items[0]
    const pad = 12
    const thumb = 34

    this.pushRect(schema, pad, pad, this.width - pad * 2, this.height - thumb - pad * 3, active?.color ?? '#60a5fa', 'media', 12)
    pushText(schema, active?.label ?? (this.props.title || this.props.kind), pad + 12, pad + 10, this.width - pad * 4, 26, this.textStyle({ color: '#ffffff', fontSize: 16, fontWeight: '700' }))

    items.forEach((item, index) => {
      const x = pad + index * (thumb + 8)
      this.pushRect(schema, x, this.height - pad - thumb, thumb, thumb, item.color ?? '#cbd5e1', 'thumbnail', 8, index === this.props.activeIndex ? '#2563eb' : '#dbe4ef')
    })
  }

  private renderImagePreview(schema: NovaSchema): void {
    this.pushRect(schema, 12, 12, this.width - 24, this.height - 24, this.props.parts?.image?.background ?? '#bae6fd', 'image', 14)
    if (this.props.image) pushIcon(schema, this.props.image, 20, 20, Math.max(24, Math.min(this.width, this.height) - 40))
    this.pushRect(schema, 12, 12, this.width - 24, this.height - 24, 'rgba(15,23,42,0.28)', 'previewMask', 14)
    pushText(schema, this.props.title || 'Preview', 24, this.height / 2 - 12, this.width - 48, 24, this.textStyle({ color: '#ffffff', fontWeight: '700' }), { align: 'center' })
  }

  private renderImageCompare(schema: NovaSchema): void {
    const split = (clamp(Number(this.props.value), 0, 100) / 100) * this.width
    this.pushRect(schema, 10, 10, this.width - 20, this.height - 20, this.props.parts?.before?.background ?? '#bfdbfe', 'before', 14)
    this.pushRect(schema, 10, 10, Math.max(0, split - 10), this.height - 20, this.props.parts?.after?.background ?? '#7dd3fc', 'after', 14)
    schema.push({ type: 'line', x1: split, y1: 14, x2: split, y2: this.height - 14, styles: { color: '#ffffff', width: 3 } })
    this.pushRect(schema, split - 10, this.height / 2 - 16, 20, 32, '#ffffff', 'handle', 999, '#0ea5e9')
  }

  private renderSkeleton(schema: NovaSchema): void {
    const part = this.part('shimmer')
    this.pushRect(schema, 16, 16, this.width * 0.42, 14, '#cbd5e1', 'line', 999)
    this.pushRect(schema, 16, 42, this.width - 48, 12, '#dbe4ef', 'line', 999)
    this.pushRect(schema, 16, 66, this.width * 0.62, 12, '#dbe4ef', 'line', 999)
    this.pushRect(schema, this.width * 0.16, 0, this.width * 0.28, this.height, part.background ?? 'rgba(255,255,255,0.42)', 'shimmer', 0)
  }

  private renderProgressBar(schema: NovaSchema): void {
    const pct = this.percent()
    this.pushRect(schema, 2, 2, Math.max(0, (this.width - 4) * pct), this.height - 4, this.props.accentColor ?? '#2563eb', 'value', 999)
  }

  private renderProgressSpinner(schema: NovaSchema): void {
    const r = Math.min(this.width, this.height) / 2 - 8
    const cx = this.width / 2
    const cy = this.height / 2
    schema.push({ type: 'circle', x: cx, y: cy, radius: r, styles: { border: { color: '#dbe4ef', width: 6 } } })
    const angle = -Math.PI / 2 + TWO_PI * this.percent()
    schema.push({ type: 'line', x1: cx, y1: cy - r, x2: cx + Math.cos(angle) * r, y2: cy + Math.sin(angle) * r, styles: { color: this.props.accentColor ?? '#2563eb', width: 6 } })
  }

  private renderMeterGroup(schema: NovaSchema): void {
    const total = this.props.items.reduce((sum, item) => sum + Number(item.value ?? 0), 0) || 1
    let x = 12
    const y = 18
    const width = this.width - 24

    for (const item of this.props.items) {
      const w = width * (Number(item.value ?? 0) / total)
      this.pushRect(schema, x, y, w, 18, item.color ?? '#94a3b8', 'meter', 999)
      x += w
    }
    this.props.items.forEach((item, index) => {
      const lx = 14 + index * 86
      schema.push({ type: 'circle', x: lx + 5, y: 52, radius: 5, styles: { background: item.color ?? '#94a3b8' } })
      pushText(schema, item.label ?? '', lx + 16, 43, 66, 18, this.textStyle({ fontSize: 11 }))
    })
  }

  private renderKnob(schema: NovaSchema): void {
    const cx = this.width / 2
    const cy = this.height / 2
    const r = Math.min(this.width, this.height) / 2 - 12
    const pct = this.percent()
    const angle = -Math.PI * 0.75 + pct * Math.PI * 1.5

    schema.push({ type: 'circle', x: cx, y: cy, radius: r, styles: { background: '#f8fafc', border: { color: '#dbe4ef', width: 6 } } })
    schema.push({ type: 'line', x1: cx, y1: cy, x2: cx + Math.cos(angle) * (r - 8), y2: cy + Math.sin(angle) * (r - 8), styles: { color: this.props.accentColor ?? '#0f766e', width: 5 } })
    pushText(schema, `${Math.round(pct * 100)}%`, cx - 28, cy - 10, 56, 20, this.textStyle({ fontWeight: '700' }), { align: 'center' })
  }

  private renderToggleSwitch(schema: NovaSchema): void {
    const checked = this.props.checked
    const h = this.height
    const knob = Math.max(18, h - 8)
    this.pushRect(schema, 0, 0, this.width, h, checked ? this.props.accentColor ?? '#2563eb' : '#cbd5e1', 'track', 999)
    this.pushRect(schema, checked ? this.width - knob - 4 : 4, 4, knob, knob, '#ffffff', 'thumb', 999)
  }

  private renderRadioButton(schema: NovaSchema): void {
    const size = Math.min(20, this.height - 6)
    const y = (this.height - size) / 2
    schema.push({ type: 'circle', x: size / 2, y: y + size / 2, radius: size / 2, styles: { background: '#ffffff', border: { color: this.props.checked ? this.props.accentColor ?? '#2563eb' : '#cbd5e1', width: 2 } } })
    if (this.props.checked) schema.push({ type: 'circle', x: size / 2, y: y + size / 2, radius: size / 2 - 6, styles: { background: this.props.accentColor ?? '#2563eb' } })
    pushText(schema, this.props.text, size + 10, 0, this.width - size - 10, this.height, this.textStyle())
  }

  private renderRating(schema: NovaSchema): void {
    const count = Math.max(1, this.props.items.length || 5)
    const active = Math.round(this.props.rating || Number(this.props.value) || 0)
    for (let index = 0; index < count; index += 1) {
      const x = 8 + index * 28
      this.pushStar(schema, x + 10, this.height / 2, 10, index < active ? this.props.accentColor ?? '#f59e0b' : '#cbd5e1')
    }
  }

  private renderSelectButton(schema: NovaSchema): void {
    const items = this.props.items
    const count = Math.max(1, items.length)
    const w = this.width / count
    const activeIndex = Math.max(0, items.findIndex(item => item.value === this.props.value))

    this.pushRect(schema, activeIndex * w + 3, 3, w - 6, this.height - 6, '#ffffff', 'indicator', 8, '#dbe4ef')
    items.forEach((item, index) => {
      pushText(schema, item.label ?? item.value ?? '', index * w + 8, 0, w - 16, this.height, this.textStyle({
        color: index === activeIndex ? this.props.accentColor ?? '#2563eb' : '#475569',
        fontWeight: index === activeIndex ? '700' : '500',
      }), { align: 'center' })
    })
  }

  private renderOverlay(schema: NovaSchema): void {
    const isDrawer = this.props.kind === 'Drawer'
    const isPopover = this.props.kind === 'Popover'
    if (!isPopover) this.pushRect(schema, 0, 0, this.width, this.height, 'rgba(15,23,42,0.10)', 'mask', 14)
    const x = isDrawer ? (this.props.direction === 'left' ? 12 : this.width * 0.26) : 18
    const y = isPopover ? 18 : 24
    const w = isDrawer ? this.width * 0.68 : this.width - 36
    const h = isPopover ? this.height - 36 : this.height - 48
    this.pushRect(schema, x, y, w, h, '#ffffff', 'surface', 12, '#cbd5e1')
    pushText(schema, this.props.title, x + 16, y + 14, w - 32, 24, this.textStyle({ fontWeight: '700', fontSize: 15 }))
    pushText(schema, this.props.subtitle, x + 16, y + 44, w - 32, 22, this.textStyle({ color: '#64748b', fontSize: 12 }))
    this.pushRect(schema, x + 16, y + h - 38, 72, 24, this.props.accentColor ?? '#2563eb', 'action', 8)
  }

  private renderToast(schema: NovaSchema): void {
    const tone = severityPalette(this.props.severity)
    schema.push({ type: 'circle', x: 26, y: this.height / 2, radius: 9, styles: { background: tone.accent } })
    pushText(schema, this.props.title, 44, 13, this.width - 58, 22, this.textStyle({ color: tone.color, fontWeight: '700' }))
    pushText(schema, this.props.subtitle, 44, 38, this.width - 58, 20, this.textStyle({ color: '#64748b', fontSize: 12 }))
  }

  private renderMessage(schema: NovaSchema): void {
    const tone = severityPalette(this.props.severity)
    schema.push({ type: 'circle', x: 22, y: this.height / 2, radius: 7, styles: { background: tone.accent } })
    pushText(schema, this.props.text, 40, 0, this.width - 52, this.height, this.textStyle({ color: tone.color, fontWeight: '600' }))
  }

  private renderBlockUi(schema: NovaSchema): void {
    pushText(schema, this.props.title, 18, 18, this.width - 36, 24, this.textStyle({ fontWeight: '700' }))
    pushText(schema, this.props.subtitle, 18, 48, this.width - 36, 38, this.textStyle({ color: '#64748b', fontSize: 12 }))
    if (this.props.blocked) {
      this.pushRect(schema, 0, 0, this.width, this.height, 'rgba(15,23,42,0.18)', 'mask', 12)
      this.pushRect(schema, this.width / 2 - 46, this.height / 2 - 14, 92, 28, '#ffffff', 'maskLabel', 999)
      pushText(schema, 'Blocked', this.width / 2 - 38, this.height / 2 - 10, 76, 20, this.textStyle({ fontWeight: '700' }), { align: 'center' })
    }
  }

  private renderDisclosure(schema: NovaSchema): void {
    pushText(schema, this.props.title, 16, 12, this.width - 48, 22, this.textStyle({ fontWeight: '700' }))
    pushText(schema, this.props.expanded ? 'v' : '>', this.width - 34, 12, 18, 22, this.textStyle({ fontWeight: '700' }), { align: 'center' })
    if (!this.props.expanded) return
    this.props.items.forEach((item, index) => {
      const y = 50 + index * 22
      schema.push({ type: 'circle', x: 22, y: y + 9, radius: 4, styles: { background: item.color ?? this.props.accentColor ?? '#2563eb' } })
      pushText(schema, item.label ?? item.value ?? '', 34, y, this.width - 48, 18, this.textStyle({ color: '#475569', fontSize: 12 }))
    })
  }

  private renderTabs(schema: NovaSchema): void {
    const items = this.props.items
    const count = Math.max(1, items.length)
    const w = this.width / count
    const active = Math.min(count - 1, this.props.activeIndex)
    this.pushRect(schema, active * w + 12, 10, w - 24, 28, '#eff6ff', 'tabActive', 8)
    items.forEach((item, index) => {
      pushText(schema, item.label ?? '', index * w + 8, 12, w - 16, 24, this.textStyle({ color: index === active ? '#1d4ed8' : '#64748b', fontWeight: index === active ? '700' : '500' }), { align: 'center' })
    })
    this.pushRect(schema, 18, 56, this.width - 36, 56, '#f8fafc', 'panel', 10, '#e2e8f0')
    pushText(schema, items[active]?.label ?? 'Tab', 32, 72, this.width - 64, 20, this.textStyle({ fontWeight: '700' }))
  }

  private renderStepper(schema: NovaSchema): void {
    const items = this.props.items
    const count = Math.max(1, items.length)
    const y = 34
    const left = 26
    const step = (this.width - left * 2) / Math.max(1, count - 1)

    items.forEach((item, index) => {
      const x = left + index * step
      if (index > 0) schema.push({ type: 'line', x1: left + (index - 1) * step + 14, y1: y, x2: x - 14, y2: y, styles: { color: index <= this.props.activeIndex ? this.props.accentColor ?? '#2563eb' : '#cbd5e1', width: 3 } })
      schema.push({ type: 'circle', x, y, radius: 13, styles: { background: index <= this.props.activeIndex ? this.props.accentColor ?? '#2563eb' : '#ffffff', border: { color: index <= this.props.activeIndex ? this.props.accentColor ?? '#2563eb' : '#cbd5e1', width: 2 } } })
      pushText(schema, item.label ?? '', x - 38, 56, 76, 18, this.textStyle({ color: '#475569', fontSize: 11 }), { align: 'center' })
    })
  }

  private setupEvents(): void {
    this.on('mousemove', event => {
      if (this.props.disabled) return
      const next = this.indexFromEvent(event)
      if (next !== this.hoveredIndex && next >= 0) this.playUiSound('hover')
      this.hoveredIndex = next
      this.dirty({ render: true })
    })
    this.on('mouseleave', () => {
      this.hoveredIndex = -1
      this.pressedIndex = -1
      this.dirty({ render: true })
    })
    this.on('mousedown', event => {
      if (this.props.disabled) {
        this.playUiSound('disabledPress')
        return false
      }
      this.focus(event)
      this.pressedIndex = this.indexFromEvent(event)
      this.dirty({ render: true })
      return false
    })
    this.on('mouseup', event => {
      const index = this.pressedIndex
      this.pressedIndex = -1
      if (this.props.kind === 'ToggleSwitch') this.toggle(event)
      if (index >= 0 && this.props.items[index]) {
        const item = this.props.items[index]
        this.props.onPress?.(item, index, event)
        this.setValue(item.value ?? index, event)
      }
      this.dirty({ render: true })
      return false
    })
  }

  private indexFromEvent(event: MouseEvent): number {
    const items = this.props.items
    if (items.length === 0) return -1
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    if (localX < 0 || localX > this.width || localY < 0 || localY > this.height) return -1
    if (this.props.kind === 'SelectButton' || this.props.kind === 'Tabs') return Math.min(items.length - 1, Math.floor(localX / (this.width / items.length)))
    return Math.min(items.length - 1, Math.floor((localX / this.width) * items.length))
  }

  private percent(): number {
    const raw = typeof this.props.value === 'number' ? this.props.value : Number(this.props.value)
    return clamp((raw - this.props.min) / Math.max(1, this.props.max - this.props.min), 0, 1)
  }

  private pushRoundAction(schema: NovaSchema, x: number, y: number, size: number, item: AdvancedItem, active: boolean): void {
    const background = item.color ?? this.props.accentColor ?? '#2563eb'
    this.pushRect(schema, x, y, size, size, active ? background : '#ffffff', 'item', 999, active ? background : '#cbd5e1')
    pushText(schema, item.icon ? '' : (item.label ?? '').slice(0, 1), x, y, size, size, this.textStyle({ color: active ? '#ffffff' : background, fontWeight: '800' }), { align: 'center' })
  }

  private pushRect(schema: NovaSchema, x: number, y: number, width: number, height: number, background: string, part: string, radius = 0, borderColor?: string): void {
    const style = this.part(part)
    schema.push({
      type: 'rect',
      x,
      y,
      width: Math.max(0, width),
      height: Math.max(0, height),
      styles: {
        background: style.background ?? background,
        opacity: style.opacity,
        border: {
          color: style.borderColor ?? borderColor ?? 'rgba(0,0,0,0)',
          width: style.borderWidth ?? (borderColor ? 1 : 0),
          radius: style.borderRadius ?? radius,
        },
      },
    })
  }

  private pushStar(schema: NovaSchema, cx: number, cy: number, radius: number, color: string): void {
    const points = Array.from({ length: 10 }, (_, index) => {
      const r = index % 2 === 0 ? radius : radius * 0.45
      const angle = -Math.PI / 2 + index * (Math.PI / 5)
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }
    })
    schema.push({ type: 'polygon', points, styles: { background: color, stroke: color, lineWidth: 1 } })
  }

  private part(name: string): NovaUiPartStyle {
    return this.props.parts?.[name] ?? {}
  }

  private textStyle(patch: Partial<ReturnType<typeof resolveComponentTextStyle>> = {}): ReturnType<typeof resolveComponentTextStyle> {
    return {
      ...resolveComponentTextStyle(this.props, this.inheritedStyleContext),
      ...patch,
    }
  }
}

export function createAdvancedComponent<E extends EventList>(
  app: NovaApp<E>,
  surface: NovaSurface<E>,
  kind: AdvancedComponentKind,
  props: AdvancedComponentProps,
  options: { componentId?: string },
  descriptor: AdvancedComponentDescriptor,
): AdvancedComponent<E> {
  if (!ADVANCED_COMPONENT_SCHEMA_TYPES[kind]) {
    throw new Error(`[Nova UI Kit] Unknown advanced component kind "${kind}"`)
  }

  return new AdvancedComponent(app, surface, kind, props, options, descriptor)
}
