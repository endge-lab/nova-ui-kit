import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  COLOR_PICKER_NODE_DESCRIPTOR,
  normalizeColorPickerProps,
  resolveColorPickerHeight,
  type ColorPickerDescriptor,
} from '@/components/ColorPicker/color-picker.config'
import type {
  ColorPickerApi,
  ColorPickerFieldId,
  ColorPickerFormat,
  ColorPickerPreset,
  ColorPickerProps,
  ColorPickerResolvedProps,
  ColorPickerValueContext,
} from '@/components/ColorPicker/color-picker.types'
import {
  clampAlpha,
  clampColorChannel,
  formatHexColor,
  formatNovaUiColor,
  hsvaToRgba,
  normalizeNovaUiColor,
  parseHexColor,
  parseNovaUiColor,
  rgbaToHsva,
  type NovaUiHsvaColor,
  type NovaUiRgbaColor,
} from '@/components/ColorPicker/color-picker-utils'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  pushText,
  resolveComponentTextStyle,
} from '@/shared/component'

type ColorPickerHitKind = 'preset' | 'custom-button' | 'format' | 'field' | 'sv' | 'hue' | 'alpha'

interface ColorPickerHit {
  id: string | null
  kind?: ColorPickerHitKind
  preset?: ColorPickerPreset
  format?: ColorPickerFormat
  field?: ColorPickerFieldId
}

const PRESET_SIZE = 34
const PRESET_GAP = 12
const PRESET_COLUMNS = 3
const CUSTOM_BUTTON_HEIGHT = 30
const CUSTOM_BUTTON_TOP = 92
const CUSTOM_TOP = 134
const PICKER_WIDTH = 240
const PICKER_HEIGHT = 94
const PICKER_COLUMNS = 24
const PICKER_ROWS = 10
const STRIP_HEIGHT = 12
const FIELD_HEIGHT = 28

/**
 * Рендерит переиспользуемый выбор цвета с presets и раскрываемым custom-блоком.
 */
export class ColorPicker<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<ColorPickerResolvedProps, ColorPickerApi, ColorPickerProps, E> {
  private readonly api: ColorPickerApi
  private hoveredId: string | null = null
  private pressedId: string | null = null
  private activeField: ColorPickerFieldId | null = null
  private invalidField: ColorPickerFieldId | null = null
  private dragging: 'sv' | 'hue' | 'alpha' | null = null
  private hsva: NovaUiHsvaColor
  private hexDraft: string
  private rgbaDraft: Record<'r' | 'g' | 'b' | 'a', string>

  /**
   * Создает ColorPicker и синхронизирует внутренние draft-поля с текущим цветом.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: ColorPickerProps = {},
    options: { componentId?: string } = {},
    descriptor: ColorPickerDescriptor = COLOR_PICKER_NODE_DESCRIPTOR,
  ) {
    super(app, surface, descriptor, normalizeColorPickerProps(props), options)
    const rgba = parseNovaUiColor(this.props.value) ?? { r: 255, g: 255, b: 255, a: 1 }
    this.hsva = rgbaToHsva(rgba)
    this.hexDraft = formatHexColor(rgba, true)
    this.rgbaDraft = createRgbaDraft(rgba)
    this.api = {
      setValue: (value, event) => this.setValue(value, { source: 'custom', event }, false),
      setCustomOpen: (open, event) => this.setCustomOpen(open, event),
      getValue: () => this.props.value,
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
    this.options({ interactive: !this.props.disabled })
    this.setupEvents()
  }

  /**
   * Применяет входящие props и нормализует высоту при раскрытии custom-блока.
   */
  override setProps(patch: ColorPickerProps): this {
    return super.setProps(patch as Partial<ColorPickerResolvedProps>)
  }

  /**
   * Возвращает публичный API ColorPicker.
   */
  override getApi(): ColorPickerApi {
    return this.api
  }

  /**
   * Выполняет отрисовку swatches, кнопки Custom и custom controls.
   */
  render(): void {
    const schema: NovaSchema = buildBoxSchema(this.props, this.width, this.height, {
      resolveThemeValue: value => this.resolveThemeValue(value),
    })
    this.appendPresets(schema)
    this.appendCustomButton(schema)
    if (this.props.customOpen) this.appendCustomControls(schema)
    this.renderer.schema(schema)
  }

  /**
   * Синхронизирует runtime-состояние после обновления props.
   */
  protected override onPropsChanged(changedKeys: Array<keyof ColorPickerResolvedProps>): void {
    this.props = normalizeColorPickerProps(this.props)
    if (changedKeys.includes('customOpen')) {
      this.applyResolvedRect({
        ...this.layoutRect,
        height: resolveColorPickerHeight(this.props.customOpen),
      })
    }
    if (changedKeys.includes('value')) this.syncDraftFromValue()
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
  }

  /**
   * Рендерит сетку предустановленных цветов.
   */
  private appendPresets(schema: NovaSchema): void {
    const startX = 0
    const startY = 0
    this.props.presets.forEach((preset, index) => {
      const col = index % PRESET_COLUMNS
      const row = Math.floor(index / PRESET_COLUMNS)
      const x = startX + col * (PRESET_SIZE + PRESET_GAP)
      const y = startY + row * (PRESET_SIZE + PRESET_GAP)
      const id = `preset:${preset.id}`
      const active = normalizeNovaUiColor(preset.value) === this.props.value
      if (this.hoveredId === id || active) {
        schema.push({
          type: 'rect',
          x: x - 7,
          y: y - 7,
          width: PRESET_SIZE + 14,
          height: PRESET_SIZE + 14,
          styles: {
            background: active ? 'rgba(22, 131, 255, 0.12)' : this.resolveThemeValue(this.props.hoverBackground ?? '#f2f5f8'),
            border: { color: active ? '#1683ff' : 'rgba(0,0,0,0)', width: active ? 1 : 0, radius: 6 },
          },
        })
      }
      schema.push({
        type: 'rect',
        x,
        y,
        width: PRESET_SIZE,
        height: PRESET_SIZE,
        styles: {
          background: normalizeNovaUiColor(preset.value),
          border: { color: preset.borderColor ?? '#334155', width: 3, radius: 4 },
        },
      })
    })
  }

  /**
   * Рендерит кнопку раскрытия custom-блока.
   */
  private appendCustomButton(schema: NovaSchema): void {
    const pressed = this.pressedId === 'custom-button'
    const hovered = this.hoveredId === 'custom-button'
    schema.push({
      type: 'rect',
      x: 0,
      y: CUSTOM_BUTTON_TOP,
      width: PICKER_WIDTH,
      height: CUSTOM_BUTTON_HEIGHT,
      styles: {
        background: pressed
          ? this.resolveThemeValue(this.props.pressedBackground ?? '#e2e8f0')
          : hovered || this.props.customOpen
            ? this.resolveThemeValue(this.props.hoverBackground ?? '#f1f5f9')
            : '#ffffff',
        border: { color: '#d8dee8', width: 1, radius: 6 },
      },
    })
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext, {}, value => this.resolveThemeValue(value))
    pushText(schema, 'Custom', 12, CUSTOM_BUTTON_TOP, PICKER_WIDTH - 24, CUSTOM_BUTTON_HEIGHT, {
      ...textStyle,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    })
    pushText(schema, this.props.customOpen ? 'Hide' : 'Show', PICKER_WIDTH - 56, CUSTOM_BUTTON_TOP, 44, CUSTOM_BUTTON_HEIGHT, {
      ...textStyle,
      color: '#64748b',
      fontSize: 11,
      lineHeight: 16,
    }, { align: 'right' })
  }

  /**
   * Рендерит custom palette, format switch и поля ввода.
   */
  private appendCustomControls(schema: NovaSchema): void {
    this.appendPickerArea(schema, 0, CUSTOM_TOP)
    this.appendStrip(schema, 'hue', 0, CUSTOM_TOP + PICKER_HEIGHT + 10)
    if (this.props.allowAlpha) this.appendStrip(schema, 'alpha', 0, CUSTOM_TOP + PICKER_HEIGHT + 32)
    this.appendFormatSwitch(schema, 0, CUSTOM_TOP + PICKER_HEIGHT + 56)
    if (this.props.format === 'hex') this.appendHexField(schema, 0, CUSTOM_TOP + PICKER_HEIGHT + 94)
    else this.appendRgbaFields(schema, 0, CUSTOM_TOP + PICKER_HEIGHT + 94)
  }

  /**
   * Рендерит двумерную область saturation/value.
   */
  private appendPickerArea(schema: NovaSchema, x: number, y: number): void {
    const cellWidth = PICKER_WIDTH / PICKER_COLUMNS
    const cellHeight = PICKER_HEIGHT / PICKER_ROWS
    for (let row = 0; row < PICKER_ROWS; row += 1) {
      for (let col = 0; col < PICKER_COLUMNS; col += 1) {
        schema.push({
          type: 'rect',
          x: x + col * cellWidth,
          y: y + row * cellHeight,
          width: cellWidth + 0.5,
          height: cellHeight + 0.5,
          styles: {
            background: formatNovaUiColor(hsvaToRgba({
              h: this.hsva.h,
              s: col / (PICKER_COLUMNS - 1),
              v: 1 - row / (PICKER_ROWS - 1),
              a: this.hsva.a,
            })),
            border: { color: 'rgba(0,0,0,0)', width: 0 },
          },
        })
      }
    }
    schema.push({ type: 'border', x, y, width: PICKER_WIDTH, height: PICKER_HEIGHT, styles: { color: '#cbd5e1', width: 1, radius: 5 } })
  }

  /**
   * Рендерит hue или alpha strip.
   */
  private appendStrip(schema: NovaSchema, kind: 'hue' | 'alpha', x: number, y: number): void {
    const segments = kind === 'hue' ? 24 : 16
    const segmentWidth = PICKER_WIDTH / segments
    for (let index = 0; index < segments; index += 1) {
      const color = kind === 'hue'
        ? formatNovaUiColor(hsvaToRgba({ h: (index / segments) * 360, s: 1, v: 1, a: 1 }))
        : formatNovaUiColor(hsvaToRgba({ ...this.hsva, a: index / (segments - 1) }))
      schema.push({
        type: 'rect',
        x: x + index * segmentWidth,
        y,
        width: segmentWidth + 0.5,
        height: STRIP_HEIGHT,
        styles: { background: color, border: { color: 'rgba(0,0,0,0)', width: 0 } },
      })
    }
    schema.push({ type: 'border', x, y, width: PICKER_WIDTH, height: STRIP_HEIGHT, styles: { color: '#cbd5e1', width: 1, radius: 4 } })
  }

  /**
   * Рендерит переключатель формата ввода.
   */
  private appendFormatSwitch(schema: NovaSchema, x: number, y: number): void {
    const width = 118
    const height = 28
    schema.push({
      type: 'rect',
      x,
      y,
      width,
      height,
      styles: { background: '#f1f5f9', border: { color: '#d8dee8', width: 1, radius: 6 } },
    })
    ;(['hex', 'rgba'] as Array<ColorPickerFormat>).forEach((format, index) => {
      const active = this.props.format === format
      const segmentX = x + index * (width / 2)
      if (active) {
        schema.push({
          type: 'rect',
          x: segmentX + 3,
          y: y + 3,
          width: width / 2 - 6,
          height: height - 6,
          styles: { background: '#ffffff', border: { color: 'rgba(15,23,42,0.12)', width: 1, radius: 5 } },
        })
      }
      const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext, {}, value => this.resolveThemeValue(value))
      pushText(schema, format.toUpperCase(), segmentX, y, width / 2, height, {
        ...textStyle,
        color: active ? '#1683ff' : '#64748b',
        fontSize: 11,
        fontWeight: '700',
        lineHeight: 16,
      }, { align: 'center' })
    })
    schema.push({
      type: 'rect',
      x: PICKER_WIDTH - 42,
      y: y + 4,
      width: 42,
      height: 20,
      styles: { background: this.props.value, border: { color: '#94a3b8', width: 1, radius: 4 } },
    })
  }

  /**
   * Рендерит HEX-поле ввода.
   */
  private appendHexField(schema: NovaSchema, x: number, y: number): void {
    this.appendField(schema, 'hex', x, y, PICKER_WIDTH, this.hexDraft, 'HEX')
  }

  /**
   * Рендерит RGBA-поля ввода.
   */
  private appendRgbaFields(schema: NovaSchema, x: number, y: number): void {
    const gap = 8
    const widths = [46, 46, 46, 70]
    let cursor = x
    ;(['r', 'g', 'b', 'a'] as Array<ColorPickerFieldId>).forEach((field, index) => {
      const width = widths[index] ?? 46
      this.appendField(schema, field, cursor, y, width, this.rgbaDraft[field as keyof typeof this.rgbaDraft] ?? '', field.toUpperCase())
      cursor += width + gap
    })
  }

  /**
   * Рендерит одно текстовое поле.
   */
  private appendField(schema: NovaSchema, field: ColorPickerFieldId, x: number, y: number, width: number, value: string, label: string): void {
    const active = this.activeField === field
    const invalid = this.invalidField === field
    schema.push({
      type: 'rect',
      x,
      y,
      width,
      height: FIELD_HEIGHT,
      styles: {
        background: '#ffffff',
        border: {
          color: invalid ? '#dc2626' : active ? '#1683ff' : '#d8dee8',
          width: 1,
          radius: 6,
        },
      },
    })
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext, {}, input => this.resolveThemeValue(input))
    pushText(schema, label, x + 8, y, field === 'hex' ? 34 : 16, FIELD_HEIGHT, {
      ...textStyle,
      color: '#94a3b8',
      fontSize: 10,
      lineHeight: 14,
    })
    const valueX = field === 'hex' ? x + 42 : x + 21
    pushText(schema, value, valueX, y, Math.max(0, width - (valueX - x) - 8), FIELD_HEIGHT, {
      ...textStyle,
      color: '#172033',
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
    })
  }

  /**
   * Настраивает события pointer и keyboard.
   */
  private setupEvents(): void {
    this.on('mousemove', event => {
      if (this.dragging) {
        this.updateCustomColorFromEvent(this.dragging, event)
        return false
      }
      const hit = this.hitTestEvent(event)
      if (hit.id === this.hoveredId) return
      this.hoveredId = hit.id
      this.dirty({ render: true })
    })
    this.on('mouseleave', () => {
      this.hoveredId = null
      this.pressedId = null
      this.dirty({ render: true })
    })
    this.on('mousedown', event => {
      if (this.props.disabled) return false
      this.focus(event)
      const hit = this.hitTestEvent(event)
      this.pressedId = hit.id
      this.handleHit(hit, event)
      this.dirty({ render: true })
      return false
    })
    this.on('mouseup', () => {
      this.pressedId = null
      this.dragging = null
      this.dirty({ render: true })
      return false
    })
    this.on('dragmove', event => {
      if (!this.dragging) return false
      this.updateCustomColorFromEvent(this.dragging, event)
      return false
    })
    this.on('dragend', () => {
      this.dragging = null
      return false
    })
    this.on('keydown', event => {
      if (!this.activeField) return
      this.handleFieldKey(event)
      return false
    })
  }

  /**
   * Выполняет действие по найденной интерактивной зоне.
   */
  private handleHit(hit: ColorPickerHit, event: MouseEvent): void {
    if (hit.kind !== 'field') this.activeField = null
    if (hit.kind === 'preset' && hit.preset) {
      this.setValue(hit.preset.value, { source: 'preset', preset: hit.preset, event }, true)
      return
    }
    if (hit.kind === 'custom-button') {
      this.setCustomOpen(!this.props.customOpen, event)
      return
    }
    if (hit.kind === 'format' && hit.format) {
      this.setProps({ format: hit.format })
      return
    }
    if (hit.kind === 'field' && hit.field) {
      this.activeField = hit.field
      return
    }
    if (hit.kind === 'sv' || hit.kind === 'hue' || hit.kind === 'alpha') {
      this.dragging = hit.kind
      this.updateCustomColorFromEvent(hit.kind, event)
    }
  }

  /**
   * Обновляет custom color по координате pointer.
   */
  private updateCustomColorFromEvent(kind: 'sv' | 'hue' | 'alpha', event: MouseEvent): void {
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    if (kind === 'sv') {
      this.hsva.s = clamp01(localX / PICKER_WIDTH)
      this.hsva.v = clamp01(1 - (localY - CUSTOM_TOP) / PICKER_HEIGHT)
    }
    if (kind === 'hue') {
      const hueY = CUSTOM_TOP + PICKER_HEIGHT + 10
      this.hsva.h = clamp01(localX / PICKER_WIDTH) * 360
      if (localY < hueY - 8 || localY > hueY + STRIP_HEIGHT + 8) return
    }
    if (kind === 'alpha' && this.props.allowAlpha) {
      this.hsva.a = clampAlpha(localX / PICKER_WIDTH)
    }
    this.setValue(formatNovaUiColor(hsvaToRgba(this.hsva)), { source: 'custom', event }, true)
  }

  /**
   * Обрабатывает ввод символов в активное поле.
   */
  private handleFieldKey(event: KeyboardEvent): void {
    if (!this.activeField) return
    if (event.key === 'Escape') {
      this.activeField = null
      this.invalidField = null
      this.dirty({ render: true })
      return
    }
    if (event.key === 'Enter') {
      this.applyDraftField(event)
      return
    }
    if (event.key === 'Backspace') {
      this.updateActiveDraft(value => value.slice(0, -1), event)
      return
    }
    if (event.key.length !== 1) return
    const allowed = this.activeField === 'hex' ? /^[#0-9a-fA-F]$/.test(event.key) : /^[0-9.]$/.test(event.key)
    if (!allowed) return
    this.updateActiveDraft(value => `${value}${event.key}`, event)
  }

  /**
   * Обновляет draft активного поля и применяет валидное значение.
   */
  private updateActiveDraft(mutator: (value: string) => string, event: KeyboardEvent): void {
    if (!this.activeField) return
    if (this.activeField === 'hex') this.hexDraft = mutator(this.hexDraft)
    else this.rgbaDraft[this.activeField] = mutator(this.rgbaDraft[this.activeField])
    this.applyDraftField(event)
  }

  /**
   * Применяет текущий draft, если он валиден.
   */
  private applyDraftField(event?: Event): void {
    if (!this.activeField) return
    const rgba = this.activeField === 'hex'
      ? parseHexColor(this.hexDraft)
      : parseRgbaDraft(this.rgbaDraft)
    if (!rgba) {
      this.invalidField = this.activeField
      this.dirty({ render: true })
      return
    }
    this.invalidField = null
    this.setValue(formatNovaUiColor(rgba), { source: 'input', event }, true)
  }

  /**
   * Обновляет значение компонента и вызывает callbacks.
   */
  private setValue(value: string, context: ColorPickerValueContext, commit: boolean): void {
    const next = normalizeNovaUiColor(value, this.props.value)
    if (next !== this.props.value) {
      this.setProps({ value: next })
      this.props.onValueChange?.(next, context)
    }
    if (commit) this.props.onCommit?.(next, context)
  }

  /**
   * Переключает раскрытие custom-блока.
   */
  private setCustomOpen(open: boolean, event?: Event): void {
    if (open === this.props.customOpen) return
    this.setProps({ customOpen: open, height: resolveColorPickerHeight(open) })
    this.props.onCustomOpenChange?.(open, event)
  }

  /**
   * Синхронизирует draft-поля и HSV-состояние из текущего value.
   */
  private syncDraftFromValue(): void {
    const rgba = parseNovaUiColor(this.props.value) ?? { r: 255, g: 255, b: 255, a: 1 }
    this.hsva = rgbaToHsva(rgba)
    this.hexDraft = formatHexColor(rgba, true)
    this.rgbaDraft = createRgbaDraft(rgba)
  }

  /**
   * Находит интерактивную зону под pointer.
   */
  private hitTestEvent(event: MouseEvent): ColorPickerHit {
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    for (let index = 0; index < this.props.presets.length; index += 1) {
      const preset = this.props.presets[index]
      if (!preset) continue
      const col = index % PRESET_COLUMNS
      const row = Math.floor(index / PRESET_COLUMNS)
      const swatchX = col * (PRESET_SIZE + PRESET_GAP)
      const swatchY = row * (PRESET_SIZE + PRESET_GAP)
      if (localX >= swatchX - 7 && localX <= swatchX + PRESET_SIZE + 7 && localY >= swatchY - 7 && localY <= swatchY + PRESET_SIZE + 7) {
        return { id: `preset:${preset.id}`, kind: 'preset', preset }
      }
    }
    if (localX >= 0 && localX <= PICKER_WIDTH && localY >= CUSTOM_BUTTON_TOP && localY <= CUSTOM_BUTTON_TOP + CUSTOM_BUTTON_HEIGHT) {
      return { id: 'custom-button', kind: 'custom-button' }
    }
    if (!this.props.customOpen) return { id: null }
    if (localX >= 0 && localX <= PICKER_WIDTH && localY >= CUSTOM_TOP && localY <= CUSTOM_TOP + PICKER_HEIGHT) return { id: 'custom:sv', kind: 'sv' }
    const hueY = CUSTOM_TOP + PICKER_HEIGHT + 10
    if (localX >= 0 && localX <= PICKER_WIDTH && localY >= hueY && localY <= hueY + STRIP_HEIGHT) return { id: 'custom:hue', kind: 'hue' }
    const alphaY = CUSTOM_TOP + PICKER_HEIGHT + 32
    if (this.props.allowAlpha && localX >= 0 && localX <= PICKER_WIDTH && localY >= alphaY && localY <= alphaY + STRIP_HEIGHT) {
      return { id: 'custom:alpha', kind: 'alpha' }
    }
    const formatY = CUSTOM_TOP + PICKER_HEIGHT + 56
    if (localY >= formatY && localY <= formatY + 28 && localX >= 0 && localX <= 118) {
      return { id: localX < 59 ? 'format:hex' : 'format:rgba', kind: 'format', format: localX < 59 ? 'hex' : 'rgba' }
    }
    const fieldY = CUSTOM_TOP + PICKER_HEIGHT + 94
    if (this.props.format === 'hex' && localX >= 0 && localX <= PICKER_WIDTH && localY >= fieldY && localY <= fieldY + FIELD_HEIGHT) {
      return { id: 'field:hex', kind: 'field', field: 'hex' }
    }
    if (this.props.format === 'rgba' && localY >= fieldY && localY <= fieldY + FIELD_HEIGHT) {
      const fields = this.resolveRgbaFieldRects()
      for (const field of fields) {
        if (localX >= field.x && localX <= field.x + field.width) return { id: `field:${field.id}`, kind: 'field', field: field.id }
      }
    }
    return { id: null }
  }

  /**
   * Возвращает геометрию RGBA-полей.
   */
  private resolveRgbaFieldRects(): Array<{ id: ColorPickerFieldId; x: number; width: number }> {
    const gap = 8
    const widths = [46, 46, 46, 70]
    let cursor = 0
    return (['r', 'g', 'b', 'a'] as Array<ColorPickerFieldId>).map((id, index) => {
      const width = widths[index] ?? 46
      const rect = { id, x: cursor, width }
      cursor += width + gap
      return rect
    })
  }
}

function createRgbaDraft(color: NovaUiRgbaColor): Record<'r' | 'g' | 'b' | 'a', string> {
  return {
    r: String(clampColorChannel(color.r)),
    g: String(clampColorChannel(color.g)),
    b: String(clampColorChannel(color.b)),
    a: String(clampAlpha(color.a)),
  }
}

function parseRgbaDraft(draft: Record<'r' | 'g' | 'b' | 'a', string>): NovaUiRgbaColor | null {
  const r = Number(draft.r)
  const g = Number(draft.g)
  const b = Number(draft.b)
  const a = Number(draft.a)
  if (![r, g, b, a].every(Number.isFinite)) return null
  return {
    r: clampColorChannel(r),
    g: clampColorChannel(g),
    b: clampColorChannel(b),
    a: clampAlpha(a),
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}
