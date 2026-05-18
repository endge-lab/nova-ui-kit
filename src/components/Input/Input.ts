import type { EventList } from '@endge/utils'
import type { NovaApp, NovaSchema, NovaSurface } from '@endge/nova'
import {
  NovaCaretBlinkController,
  NovaClipboardService,
  NovaInputProxyService,
  NovaInputValidationController,
  NovaInputTextLayoutEngine,
  NovaTextInputController,
  type NovaInputValidationResult,
  type NovaRectLike,
  type NovaTextInputLayoutResult,
} from '@endge/nova'
import {
  INPUT_NODE_DESCRIPTOR,
  normalizeInputProps,
  type InputDescriptor,
} from '@/components/Input/input.config'
import type {
  InputApi,
  InputComponentKind,
  InputProps,
  InputResolvedProps,
  SelectInputOption,
} from '@/components/Input/input.types'
import {
  NovaUiComponentNode,
  buildBoxSchema,
  resolveComponentTextStyle,
  resolveInteractionBackground,
} from '@/shared/component/component-props'
import { pushIcon, pushText } from '@/shared/component/component-render'

const layoutEngine = new NovaInputTextLayoutEngine()
const clipboard = new NovaClipboardService()

export class Input<E extends EventList = Record<string, any>>
  extends NovaUiComponentNode<InputResolvedProps, InputApi, InputProps, E> {
  protected hovered = false
  protected pressed = false
  protected selecting = false
  protected controller: NovaTextInputController
  protected validator: NovaInputValidationController<unknown, any>
  protected proxy: NovaInputProxyService
  protected caretVisible = false
  protected layoutCache?: NovaTextInputLayoutResult
  protected validationMessage?: string
  protected readonly api: InputApi
  protected revealed = false
  protected scrollY = 0

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    props: InputProps = {},
    options: { componentId?: string; kind?: InputComponentKind } = {},
    descriptor: InputDescriptor = INPUT_NODE_DESCRIPTOR,
  ) {
    const kind = options.kind ?? 'input'
    super(app, surface, descriptor, normalizeInputProps(props, kind), options)
    this.kindName = kind
    this.controller = this.createController()
    this.validator = this.createValidator()
    this.proxy = this.createProxy()
    this.api = this.createApi()
    this.options({ interactive: !this.props.disabled })
    this.setupEvents()
    if (this.props.autofocus) this.focusInput()
  }

  protected kindName: InputComponentKind = 'input'

  override setProps(patch: InputProps): this {
    return super.setProps(patch as Partial<InputResolvedProps>)
  }

  override getApi(): InputApi {
    return this.api
  }

  render(): void {
    this.layoutCache = this.createTextLayout()
    const schema = this.renderInputFrame()
    this.pushInputContent(schema)
    if (this.kindName === 'select' && this.props.opened) this.pushSelectMenu(schema)
    this.renderer.schema(schema)
  }

  protected override onPropsChanged(changedKeys: Array<keyof InputResolvedProps>): void {
    const previousValue = this.props.value
    this.props = normalizeInputProps(this.props, this.kindName)
    this.options({ interactive: !this.props.disabled })
    this.applyCommonPropsChanged(changedKeys)
    if (changedKeys.includes('value') && previousValue !== this.props.value) {
      this.controller.setValue(this.formatValue(this.props.value ?? ''))
    }
    if (changedKeys.includes('disabled') || changedKeys.includes('readonly') || changedKeys.includes('maxLength')) {
      this.controller = this.createController(this.controller.getState().draft)
    }
    if (changedKeys.includes('validate')) this.validator = this.createValidator()
  }

  protected override onUnmount(): void {
    this.caret.stop()
    this.proxy.dispose()
    super.onUnmount()
  }

  protected readonly caret = new NovaCaretBlinkController(visible => {
    this.caretVisible = visible
    this.dirty({ render: true })
  })

  protected createApi(): InputApi {
    return {
      focus: () => this.focusInput(),
      blur: () => this.blurInput(),
      select: (start = 0, end = start) => {
        this.controller.select(start, end)
        this.syncProxy()
        this.dirty({ render: true })
      },
      selectAll: () => {
        this.controller.selectAll()
        this.syncProxy()
        this.dirty({ render: true })
      },
      setValue: (value, event) => this.setInputValue(value, { event, reason: 'api' }),
      commit: event => this.commitInput({ event, reason: 'api' }),
      cancel: event => this.cancelInput({ event, reason: 'api' }),
      validate: async () => (await this.runValidation('manual')).result,
      getState: () => {
        const state = this.controller.getState()
        const validation = this.validator.getState()
        return {
          value: this.readParsedValue(),
          draft: state.draft,
          focused: state.focused,
          dirty: state.dirty,
          touched: validation.touched,
          invalid: validation.result !== true || !!this.props.error,
          validationMessage: this.props.error ?? validation.message,
          inputEngine: this.props.inputEngine,
        }
      },
      getSelection: () => {
        const selection = this.controller.getSelection()
        return { start: selection.start, end: selection.end }
      },
      getCaretRect: () => this.getCaretRect(),
      setProps: patch => this.setProps(patch),
      getProps: () => this.props,
    }
  }

  protected renderInputFrame(): NovaSchema {
    const focused = this.controller.getState().focused
    const invalid = this.isInvalid()
    const border = this.props.border
      ? {
          ...this.props.border,
          color: invalid ? this.props.errorColor : focused ? this.props.focusBorderColor : this.props.border.color,
        }
      : undefined

    const schema = buildBoxSchema(this.props, this.width, this.height, {
      background: resolveInteractionBackground(this.props, {
        hovered: this.hovered,
        pressed: this.pressed,
        active: focused,
      }),
      border,
    })

    if (this.props.variant === 'underline') {
      schema.push({
        type: 'rect',
        x: 0,
        y: this.height - 1,
        width: this.width,
        height: focused ? 2 : 1,
        styles: { background: invalid ? this.props.errorColor : focused ? this.props.focusBorderColor : '#cbd5e1' },
      })
    }

    return schema
  }

  protected pushInputContent(schema: NovaSchema): void {
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
    const state = this.controller.getState()
    const layout = this.layoutCache ?? this.createTextLayout()
    const visibleText = this.displayText(state.draft)
    const empty = visibleText.length === 0
    const textColor = empty ? this.props.placeholderColor : textStyle.color
    const text = empty ? this.props.placeholder : visibleText
    const iconSize = Math.max(12, Math.min(18, (this.props.fontSize ?? textStyle.fontSize) + 3))

    if (this.props.icon) pushIcon(schema, this.props.icon, 10, (this.height - iconSize) / 2, iconSize, this.props.disabled ? 0.5 : 0.85)
    if (this.kindName === 'search' && !this.props.icon) this.pushSearchGlyph(schema, 12, this.height / 2, iconSize)
    if (this.props.prefix) pushText(schema, this.props.prefix, 10, 0, 36, this.height, { ...textStyle, color: '#64748b' }, { align: 'center' })
    if (this.props.suffix) pushText(schema, this.props.suffix, this.width - 46, 0, 36, this.height, { ...textStyle, color: '#64748b' }, { align: 'center' })

    const contentX = layout.contentX
    const contentY = this.kindName === 'textarea' ? layout.contentY : (this.height - textStyle.lineHeight) / 2
    const contentWidth = layout.contentWidth
    const contentHeight = this.kindName === 'textarea' ? layout.contentHeight : textStyle.lineHeight

    for (const rect of layoutEngine.selectionRects(layout, state.selectionStart, state.selectionEnd)) {
      schema.push({
        type: 'rect',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        styles: { background: this.props.selectionColor },
      })
    }

    if (this.kindName === 'textarea') {
      this.pushMultilineText(schema, text, contentX, contentY, contentWidth, textStyle, textColor)
    } else {
      pushText(schema, text, contentX, contentY, contentWidth, contentHeight, { ...textStyle, color: textColor }, { align: this.props.align, ellipsis: true })
    }

    if (state.focused && this.caretVisible && !this.props.readonly && !this.props.disabled) {
      const caret = this.getCaretRect()
      schema.push({
        type: 'rect',
        x: caret.x,
        y: caret.y,
        width: Math.max(1, caret.width),
        height: caret.height,
        styles: { background: this.props.caretColor },
      })
    }

    if (this.props.clearable && state.draft.length > 0) this.pushClearButton(schema)
    if (this.kindName === 'password' && this.props.revealable) this.pushRevealButton(schema)
    if (this.kindName === 'select') this.pushSelectChevron(schema)
    if (this.isInvalid() && this.kindName !== 'field') this.pushErrorMark(schema)
  }

  protected pushMultilineText(schema: NovaSchema, text: string, x: number, y: number, width: number, style: ReturnType<typeof resolveComponentTextStyle>, color: string): void {
    const lines = text.length ? text.split('\n') : [this.props.placeholder]
    const maxLines = Math.max(1, Math.floor((this.height - y) / style.lineHeight))
    for (let index = 0; index < Math.min(lines.length, maxLines); index += 1) {
      pushText(schema, lines[index], x, y + index * style.lineHeight, width, style.lineHeight, { ...style, color }, { align: this.props.align, ellipsis: true })
    }
  }

  protected pushSelectMenu(schema: NovaSchema): void {
    const textStyle = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
    const optionHeight = 28
    const height = Math.min(160, this.props.options.length * optionHeight)
    schema.push({
      type: 'rect',
      x: 0,
      y: this.height + 4,
      width: this.width,
      height,
      styles: {
        background: '#ffffff',
        border: { color: '#cbd5e1', width: 1, radius: 8 },
      },
    })
    this.props.options.slice(0, Math.floor(height / optionHeight)).forEach((option, index) => {
      const active = String(option.value) === this.controller.getState().draft
      schema.push({
        type: 'rect',
        x: 4,
        y: this.height + 8 + index * optionHeight,
        width: this.width - 8,
        height: optionHeight - 4,
        styles: { background: active ? '#eff6ff' : 'rgba(255,255,255,0)', border: { width: 0, radius: 6 } },
      })
      pushText(schema, option.label, 12, this.height + 8 + index * optionHeight, this.width - 24, optionHeight - 4, textStyle, { ellipsis: true })
    })
  }

  protected setupEvents(): void {
    this.on('mouseenter', () => {
      if (this.props.disabled) return
      this.hovered = true
      this.playUiSound('hover')
      this.dirty({ render: true })
    })
    this.on('mouseleave', () => {
      this.hovered = false
      this.pressed = false
      this.selecting = false
      this.dirty({ render: true })
    })
    this.on('mousedown', event => {
      if (this.props.disabled) {
        this.playUiSound('disabledPress')
        return false
      }
      this.focusInput(event)
      this.pressed = true
      this.selecting = true
      if (this.kindName === 'select') {
        const option = this.optionFromEvent(event)
        if (option) {
          this.pickOption(option, event)
          return false
        }
        this.toggleSelect()
      }
      if (this.hitClearButton(event)) {
        this.setInputValue('', { event, reason: 'clear' })
        return false
      }
      if (this.hitRevealButton(event)) {
        this.revealed = !this.revealed
        this.dirty({ render: true })
        return false
      }
      const index = this.indexFromEvent(event)
      this.controller.select(index, index)
      this.syncProxy()
      this.caret.reset()
      this.dirty({ render: true })
      return false
    })
    this.on('mousemove', event => {
      if (!this.selecting || this.props.disabled) return
      const index = this.indexFromEvent(event)
      const selection = this.controller.getSelection()
      this.controller.select(selection.start, index)
      this.syncProxy()
      this.dirty({ render: true })
    })
    this.on('mouseup', () => {
      this.pressed = false
      this.selecting = false
      this.dirty({ render: true })
      return false
    })
    this.on('dblclick', event => {
      const index = this.indexFromEvent(event)
      this.selectWord(index)
      return false
    })
    this.on('focus', () => this.focusInput())
    this.on('blur', () => this.blurInput())
    this.on('keydown', event => {
      this.handleKeydown(event)
    })
    this.on('wheel', event => {
      if (this.kindName === 'number' && this.controller.getState().focused) {
        this.stepNumber(event.deltaY < 0 ? 1 : -1, event)
        return false
      }
      if (this.kindName === 'textarea') {
        this.scrollY = Math.max(0, this.scrollY + event.deltaY)
        this.dirty({ render: true })
        return false
      }
    })
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (this.props.disabled) return
    const command = event.metaKey || event.ctrlKey
    if (command && event.key.toLowerCase() === 'c') {
      void clipboard.writeText(this.controller.getSelectedText(), this.proxy.element)
      event.preventDefault()
      return
    }
    if (command && event.key.toLowerCase() === 'x') {
      void clipboard.writeText(this.controller.getSelectedText(), this.proxy.element)
      this.controller.deleteForward({ event, reason: 'cut' })
      this.afterInput('cut', event)
      event.preventDefault()
      return
    }
    if (command && event.key.toLowerCase() === 'v') {
      void clipboard.readText(this.proxy.element).then(result => {
        if (result.ok && result.text !== undefined) {
          this.controller.insertText(result.text, { event, reason: 'paste' })
          this.afterInput('paste', event)
        }
      })
      event.preventDefault()
      return
    }
    if (this.kindName === 'number' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      this.stepNumber(event.key === 'ArrowUp' ? 1 : -1, event)
      event.preventDefault()
      return
    }
    const handled = this.controller.handleKeydown(event, { event, reason: 'keyboard' })
    if (handled) this.afterInput(event.key === 'Enter' ? 'commit' : 'keyboard', event)
    if (this.kindName === 'search' && event.key === 'Enter') this.props.onSearch?.(this.controller.getState().draft, this.context('search', event))
  }

  protected setInputValue(value: string | number, context: { event?: Event; reason?: string } = {}): void {
    this.controller.setValue(this.formatValue(value), context)
    this.syncProxy()
    this.runValidationIfNeeded('onChange', context.event)
    this.props.onValueChange?.(this.readParsedValue(), this.context(context.reason ?? 'setValue', context.event))
    this.dirty({ render: true })
  }

  protected commitInput(context: { event?: Event; reason?: string } = {}): void {
    this.controller.commit(context)
    this.runValidationIfNeeded('onCommit', context.event)
    this.props.onCommit?.(this.readParsedValue(), this.context(context.reason ?? 'commit', context.event))
    this.playUiSound('change')
    this.dirty({ render: true })
  }

  protected cancelInput(context: { event?: Event; reason?: string } = {}): void {
    this.controller.cancel(context)
    this.props.onCancel?.(this.context(context.reason ?? 'cancel', context.event))
    this.syncProxy()
    this.dirty({ render: true })
  }

  protected focusInput(event?: Event): void {
    this.focus(event)
    this.controller.focus()
    if (this.props.selectOnFocus) this.controller.selectAll()
    const state = this.controller.getState()
    this.proxy.focus(state.draft, state.selectionStart, state.selectionEnd)
    this.caret.start()
    this.caret.reset()
    this.dirty({ render: true })
  }

  protected blurInput(): void {
    this.controller.blur()
    this.proxy.blur()
    this.caret.stop()
    this.validator.markTouched()
    this.runValidationIfNeeded('onBlur')
    this.dirty({ render: true })
  }

  protected afterInput(reason: string, event?: Event): void {
    this.syncProxy()
    this.caret.reset()
    this.validator.markDirty()
    this.runValidationIfNeeded('onChange', event)
    this.props.onValueChange?.(this.readParsedValue(), this.context(reason, event))
    this.dirty({ render: true })
  }

  protected async runValidation(reason: string): Promise<{ result: NovaInputValidationResult; message?: string }> {
    const state = await this.validator.validate(this.readParsedValue(), this.context(reason))
    this.validationMessage = state.message
    this.props.onValidationChange?.(state.result, this.context(reason))
    this.dirty({ render: true })
    return { result: state.result, message: state.message }
  }

  protected runValidationIfNeeded(mode: InputResolvedProps['validation'], event?: Event): void {
    if (this.props.validation !== mode || !this.props.validate) return
    void this.validator.validate(this.readParsedValue(), this.context(mode, event)).then(state => {
      this.validationMessage = state.message
      this.props.onValidationChange?.(state.result, this.context(mode, event))
      this.dirty({ render: true })
    })
  }

  protected readParsedValue(): unknown {
    const text = this.controller.getState().draft
    if (this.props.parse) return this.props.parse(text, this.context('parse'))
    if (this.kindName === 'number') {
      const value = Number(text)
      return Number.isFinite(value) ? value : undefined
    }
    return text
  }

  protected formatValue(value: unknown): string {
    if (this.props.format) return this.props.format(value, this.context('format'))
    if (this.kindName === 'number' && typeof value === 'number' && Number.isFinite(value) && this.props.precision !== undefined) {
      return value.toFixed(this.props.precision)
    }
    return value === undefined || value === null ? '' : String(value)
  }

  protected createController(value?: string): NovaTextInputController {
    return new NovaTextInputController({
      value: value ?? this.formatValue(this.props.value ?? this.props.defaultValue ?? ''),
      multiline: this.kindName === 'textarea',
      readonly: this.props.readonly,
      disabled: this.props.disabled,
      maxLength: this.props.maxLength,
      onCommit: (_value, context) => {
        if (context.reason !== 'api') this.props.onCommit?.(this.readParsedValue(), this.context(context.reason ?? 'commit', context.event))
      },
      onCancel: context => this.props.onCancel?.(this.context(context.reason ?? 'cancel', context.event)),
    })
  }

  protected createValidator(): NovaInputValidationController<unknown, any> {
    return new NovaInputValidationController(this.props.validate)
  }

  protected createProxy(): NovaInputProxyService {
    return new NovaInputProxyService({
      engine: this.props.inputEngine,
      onInput: (value, event) => {
        if (this.props.inputEngine === 'canvas') return
        this.controller.setDraft(value, { event, reason: 'proxy' })
        this.afterInput('proxy', event)
      },
      onCompositionStart: () => this.controller.startComposition(),
      onCompositionUpdate: event => this.controller.updateComposition(event.data, { event, reason: 'composition' }),
      onCompositionEnd: () => this.controller.endComposition(),
    })
  }

  protected createTextLayout(): NovaTextInputLayoutResult {
    const style = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
    const leftInset = (this.props.icon || this.kindName === 'search') ? 34 : this.props.prefix ? 44 : 10
    const rightInset = this.props.clearable || this.kindName === 'password' || this.kindName === 'select' ? 34 : this.props.suffix ? 44 : 10
    return layoutEngine.layout({
      text: this.displayText(this.controller.getState().draft),
      width: this.width,
      height: this.height,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      multiline: this.kindName === 'textarea',
      wrap: this.props.wrap,
      scrollY: this.scrollY,
      padding: {
        top: this.kindName === 'textarea' ? 8 : Math.max(0, (this.height - style.lineHeight) / 2),
        left: leftInset,
        right: rightInset,
        bottom: 8,
      },
    })
  }

  protected displayText(value: string): string {
    if (this.kindName === 'password' && !this.revealed) return '*'.repeat(value.length)
    const selected = this.kindName === 'select'
      ? this.props.options.find(option => String(option.value) === value)
      : undefined
    return selected?.label ?? value
  }

  protected getCaretRect(): NovaRectLike {
    const layout = this.layoutCache ?? this.createTextLayout()
    return layoutEngine.caretRect(layout, this.controller.getState().selectionEnd)
  }

  protected indexFromEvent(event: MouseEvent): number {
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    return layoutEngine.coordinateToIndex(this.layoutCache ?? this.createTextLayout(), localX, localY)
  }

  protected selectWord(index: number): void {
    const text = this.controller.getState().draft
    const left = text.slice(0, index).search(/\S+$/)
    const start = left < 0 ? index : left
    const match = text.slice(index).match(/\s/)
    const end = match ? index + (match.index ?? 0) : text.length
    this.controller.select(start, end)
    this.syncProxy()
    this.dirty({ render: true })
  }

  protected syncProxy(): void {
    const state = this.controller.getState()
    this.proxy.sync(state.draft, state.selectionStart, state.selectionEnd)
  }

  protected stepNumber(direction: number, event?: Event): void {
    const current = Number(this.controller.getState().draft)
    const base = Number.isFinite(current) ? current : 0
    const stepped = base + direction * this.props.step
    const min = this.props.min ?? Number.NEGATIVE_INFINITY
    const max = this.props.max ?? Number.POSITIVE_INFINITY
    const clamped = Math.min(max, Math.max(min, stepped))
    this.setInputValue(clamped, { event, reason: 'step' })
  }

  protected toggleSelect(): void {
    this.setProps({ opened: !this.props.opened })
  }

  protected optionFromEvent(event: MouseEvent): SelectInputOption | undefined {
    if (this.kindName !== 'select' || !this.props.opened) return undefined
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    if (localX < 0 || localX > this.width || localY < this.height + 4) return undefined
    const index = Math.floor((localY - this.height - 8) / 28)
    return this.props.options[index]
  }

  protected pickOption(option: SelectInputOption, event?: Event): void {
    if (option.disabled) return
    this.setInputValue(option.value, { event, reason: 'select' })
    this.commitInput({ event, reason: 'select' })
    this.setProps({ opened: false })
  }

  protected hitClearButton(event: MouseEvent): boolean {
    if (!this.props.clearable) return false
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    return localX >= this.width - 30 && localX <= this.width - 8 && localY >= 6 && localY <= this.height - 6
  }

  protected hitRevealButton(event: MouseEvent): boolean {
    if (this.kindName !== 'password' || !this.props.revealable) return false
    const { x, y } = this.events.getCanvasMousePosition(event)
    const [localX, localY] = this.toLocal(x, y)
    return localX >= this.width - 30 && localX <= this.width - 8 && localY >= 6 && localY <= this.height - 6
  }

  protected context(reason: string, event?: Event): { event?: Event; reason: string; component: InputComponentKind } {
    return { event, reason, component: this.kindName }
  }

  protected isInvalid(): boolean {
    return !!this.props.error || this.validator.getState().result !== true
  }

  protected pushClearButton(schema: NovaSchema): void {
    const x = this.width - 22
    const y = this.height / 2
    schema.push({ type: 'circle', x, y, radius: 8, styles: { background: 'rgba(148,163,184,0.18)' } })
    schema.push({ type: 'line', x1: x - 3, y1: y - 3, x2: x + 3, y2: y + 3, styles: { color: '#64748b', width: 1.5 } })
    schema.push({ type: 'line', x1: x + 3, y1: y - 3, x2: x - 3, y2: y + 3, styles: { color: '#64748b', width: 1.5 } })
  }

  protected pushRevealButton(schema: NovaSchema): void {
    pushText(schema, this.revealed ? 'hide' : 'show', this.width - 42, 0, 38, this.height, {
      ...resolveComponentTextStyle(this.props, this.inheritedStyleContext),
      color: '#2563eb',
      fontSize: 11,
    }, { align: 'center' })
  }

  protected pushSelectChevron(schema: NovaSchema): void {
    const cx = this.width - 18
    const cy = this.height / 2
    schema.push({ type: 'polygon', points: [{ x: cx - 4, y: cy - 2 }, { x: cx + 4, y: cy - 2 }, { x: cx, y: cy + 4 }], styles: { background: '#64748b' } })
  }

  protected pushSearchGlyph(schema: NovaSchema, x: number, y: number, size: number): void {
    schema.push({ type: 'circle', x: x + size / 2 - 2, y: y - 1, radius: size / 3, styles: { border: { color: '#64748b', width: 1.6 } } })
    schema.push({ type: 'line', x1: x + size - 3, y1: y + size / 4, x2: x + size + 3, y2: y + size / 2, styles: { color: '#64748b', width: 1.6 } })
  }

  protected pushErrorMark(schema: NovaSchema): void {
    schema.push({ type: 'circle', x: this.width - 10, y: 10, radius: 3, styles: { background: this.props.errorColor } })
  }
}

export class TextInput<E extends EventList = Record<string, any>> extends Input<E> {}

export class PasswordInput<E extends EventList = Record<string, any>> extends Input<E> {
  constructor(app: NovaApp<E>, surface: NovaSurface<E>, props: InputProps = {}, options: { componentId?: string } = {}, descriptor: InputDescriptor = INPUT_NODE_DESCRIPTOR) {
    super(app, surface, props, { ...options, kind: 'password' }, descriptor)
  }
}

export class SearchInput<E extends EventList = Record<string, any>> extends Input<E> {
  constructor(app: NovaApp<E>, surface: NovaSurface<E>, props: InputProps = {}, options: { componentId?: string } = {}, descriptor: InputDescriptor = INPUT_NODE_DESCRIPTOR) {
    super(app, surface, props, { ...options, kind: 'search' }, descriptor)
  }
}

export class NumberInput<E extends EventList = Record<string, any>> extends Input<E> {
  constructor(app: NovaApp<E>, surface: NovaSurface<E>, props: InputProps = {}, options: { componentId?: string } = {}, descriptor: InputDescriptor = INPUT_NODE_DESCRIPTOR) {
    super(app, surface, props, { ...options, kind: 'number' }, descriptor)
  }

  protected override handleKeydown(event: KeyboardEvent): void {
    const command = event.metaKey || event.ctrlKey
    const printable = event.key.length === 1
    if (!command && printable && !/[\d.+-]/.test(event.key)) {
      event.preventDefault()
      return
    }
    super.handleKeydown(event)
  }
}

export class TextArea<E extends EventList = Record<string, any>> extends Input<E> {
  constructor(app: NovaApp<E>, surface: NovaSurface<E>, props: InputProps = {}, options: { componentId?: string } = {}, descriptor: InputDescriptor = INPUT_NODE_DESCRIPTOR) {
    super(app, surface, props, { ...options, kind: 'textarea' }, descriptor)
  }
}

export class InputField<E extends EventList = Record<string, any>> extends Input<E> {
  constructor(app: NovaApp<E>, surface: NovaSurface<E>, props: InputProps = {}, options: { componentId?: string } = {}, descriptor: InputDescriptor = INPUT_NODE_DESCRIPTOR) {
    super(app, surface, props, { ...options, kind: 'field' }, descriptor)
  }

  override render(): void {
    const schema: NovaSchema = []
    const style = resolveComponentTextStyle(this.props, this.inheritedStyleContext)
    if (this.props.label) {
      pushText(schema, `${this.props.label}${this.props.required ? ' *' : ''}`, 0, 0, this.width, 18, { ...style, fontSize: 12, color: '#475569' }, { ellipsis: true })
    }
    const inputY = this.props.label ? 22 : 0
    const inputHeight = Math.min(36, Math.max(28, this.height - inputY - (this.props.hint || this.isInvalid() ? 20 : 0)))
    this.layoutCache = layoutEngine.layout({
      text: this.controller.getState().draft,
      width: this.width,
      height: inputHeight,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      padding: { top: Math.max(0, (inputHeight - style.lineHeight) / 2), left: 10, right: 10, bottom: 6 },
    })
    const invalid = this.isInvalid()
    schema.push({
      type: 'rect' as const,
      x: 0,
      y: inputY,
      width: this.width,
      height: inputHeight,
      styles: {
        background: this.props.background,
        border: {
          color: invalid ? this.props.errorColor : this.controller.getState().focused ? this.props.focusBorderColor : this.props.border?.color ?? '#cbd5e1',
          width: this.props.border?.width ?? 1,
          radius: this.props.border?.radius ?? 8,
        },
      },
    } as any)
    const text = this.controller.getState().draft || this.props.placeholder
    pushText(schema, text, 10, inputY, this.width - 20, inputHeight, {
      ...style,
      color: this.controller.getState().draft ? style.color : this.props.placeholderColor,
    }, { ellipsis: true })
    const supportText = this.props.error ?? this.validationMessage ?? this.props.hint
    if (supportText) {
      pushText(schema, supportText, 0, inputY + inputHeight + 4, this.width, 18, {
        ...style,
        fontSize: 12,
        color: this.isInvalid() ? this.props.errorColor : '#64748b',
      }, { ellipsis: true })
    }
    this.renderer.schema(schema)
  }
}

export class SelectInput<E extends EventList = Record<string, any>> extends Input<E> {
  constructor(app: NovaApp<E>, surface: NovaSurface<E>, props: InputProps = {}, options: { componentId?: string } = {}, descriptor: InputDescriptor = INPUT_NODE_DESCRIPTOR) {
    super(app, surface, props, { ...options, kind: 'select' }, descriptor)
  }

  protected override handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      this.toggleSelect()
      event.preventDefault()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const options = this.props.options.filter(option => !option.disabled)
      const state = this.controller.getState()
      const currentIndex = Math.max(0, options.findIndex(option => String(option.value) === state.draft))
      const next = options[Math.max(0, Math.min(options.length - 1, currentIndex + (event.key === 'ArrowDown' ? 1 : -1)))]
      if (next) this.pickOption(next, event)
      event.preventDefault()
      return
    }
    super.handleKeydown(event)
  }
}
