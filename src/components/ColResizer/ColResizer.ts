import type { NovaApp, NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { ResizerOptions } from '@/domain/domain.types'
import { NovaNode } from '@endge/nova'
import { resolveNovaUiMotionOptions } from '@/shared/motion'

/**
 * Описывает ответственность ColResizer в архитектуре проекта.
 */
export class ColResizer<E extends EventList> extends NovaNode<E> {
  private _color: string
  private _hoverColor: string
  private _activeColor: string
  private _overlayColor: string
  private _lineWidth: number
  private _hitSize: number
  private _isDragging = false
  private _isHover = false
  private _disabled = false
  private _motionEnabled = true
  private _onChangeStart: (e: MouseEvent) => void = () => {}
  private _onChangeMove: (e: MouseEvent, dx: number) => void = () => {}
  private _onChangeEnd: (e: MouseEvent) => void = () => {}

  /**
   * Создает экземпляр ColResizer и подготавливает базовое состояние.
   */
  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    color: string = '#c5c5c5',
    lineWidth: number = 1,
  ) {
    super(app, surface)
    this.__type = 'ColResizer'
    this._color = color
    this._hoverColor = color
    this._activeColor = color
    this._overlayColor = 'rgba(37,99,235,0.14)'
    this._lineWidth = lineWidth
    this._hitSize = Math.max(6, lineWidth)
    this.options({ width: this._hitSize, height: 0 })
    this._setupEvents()
  }

  /**
   * Обновляет значение состояния ColResizer.
   */
  private _setupEvents(): void {
    this.on('dragstart', (e) => {
      if (this._disabled) {
        return false
      }
      this._onChangeStart(e)
      if (e.defaultPrevented) {
        return false
      }

      this._isDragging = true
      if (this._motionEnabled) {
        this.nova.motion.to(this, { scaleX: 1.08, opacity: 0.85 }, resolveNovaUiMotionOptions('pressFeedback'))
      }
      this.nova.invalidate()
      return false
    })

    this.on('dragmove', (e, dx) => {
      if (this._disabled) {
        return false
      }
      this._onChangeMove(e, dx)
      if (e.defaultPrevented) {
        return false
      }
      this.nova.invalidate()
      return false
    })

    this.on('dragend', (e) => {
      if (this._disabled) {
        return false
      }
      this._onChangeEnd(e)
      if (e.defaultPrevented) {
        return false
      }

      this._isDragging = false
      if (this._motionEnabled) {
        this.nova.motion.to(this, { scaleX: 1, opacity: 1 }, resolveNovaUiMotionOptions('pressFeedback'))
      }
      this.nova.invalidate()
      return false
    })

    this.on('mouseenter', () => {
      if (this._disabled) {
        return
      }
      this._isHover = true
      this.nova.invalidate()
    })

    this.on('mouseleave', () => {
      this._isHover = false
      if (!this._isDragging) {
        this.nova.invalidate()
      }
    })
  }

  /**
   * Обрабатывает входящее событие ColResizer.
   */
  onChangeStart(handler: (e: MouseEvent) => void): ColResizer<E> {
    this._onChangeStart = handler
    return this
  }

  /**
   * Обрабатывает входящее событие ColResizer.
   */
  onChangeMove(handler: (e: MouseEvent, dx: number) => void): ColResizer<E> {
    this._onChangeMove = handler
    return this
  }

  /**
   * Обрабатывает входящее событие ColResizer.
   */
  onChangeEnd(handler: (e: MouseEvent) => void): ColResizer<E> {
    this._onChangeEnd = handler
    return this
  }

  /**
   * Выполняет отрисовку ColResizer.
   */
  render(): void {
    const centerX = this.width / 2
    const y1 = 0
    const y2 = this.height

    this.renderer.schema([
      {
        type: 'line',
        x1: centerX,
        y1,
        x2: centerX,
        y2,
        styles: {
          color: this._isDragging ? this._activeColor : this._isHover ? this._hoverColor : this._color,
          width: this._lineWidth,
          opacity: this._disabled ? 0.45 : 1,
        },
      },
      {
        type: 'rect',
        x: Math.min(0, centerX),
        y: 0,
        width: Math.max(0, centerX),
        height: this.height,
        styles: { background: this._overlayColor },
        active: this._isDragging,
      },
    ])
  }

  /**
   * Выполняет действие options в рамках ответственности ColResizer.
   */
  options(opts: Partial<ResizerOptions>): this {
    const {
      color,
      hoverColor,
      activeColor,
      overlayColor,
      lineWidth,
      hitSize,
      disabled,
      motion,
      ...rest
    } = opts
    super.options({
      ...rest,
      interactive: disabled !== true,
      active: disabled !== true,
      cursor: { hover: 'col-resize', pressed: 'col-resize', dragging: 'col-resize', disabled: 'not-allowed' },
      cursorContext: { axis: 'x', disabled: disabled === true },
    })
    this._color = color ?? this._color
    this._hoverColor = hoverColor ?? this._hoverColor ?? this._color
    this._activeColor = activeColor ?? this._activeColor ?? this._hoverColor
    this._overlayColor = overlayColor ?? this._overlayColor
    this._lineWidth = lineWidth ?? this._lineWidth
    this._hitSize = hitSize ?? this._hitSize
    this._disabled = disabled ?? this._disabled
    this._motionEnabled = motion !== false
    this.setLocalRenderBounds({ x: 0, y: 0, width: Math.max(this.width, this._hitSize), height: this.height })
    return this
  }

  // --- Новый статический метод для создания ресайзера ---
  /**
   * Создает runtime-сущность ColResizer.
   */
  static create<E extends EventList>(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    params: ResizerOptions,
  ): ColResizer<E> {
    const {
      color = '#c5c5c5',
      lineWidth = 1,
      x = 0,
      y = 0,
      width = 6,
      height = 0,
    } = params

    const resizer = new ColResizer<E>(app, surface, color, lineWidth)
    resizer.options(params)
    resizer.setPosition(x, y)
    resizer.setSize(width, height)
    return resizer
  }
}
