import { NovaNode } from '@endge/nova'
import type { NovaApp , NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { ResizerOptions } from '@/domain/domain.types'
import { resolveNovaUiMotionOptions } from '@/shared/motion'

export class RowResizer<E extends EventList> extends NovaNode<E> {
  private _color: string
  private _hoverColor: string
  private _activeColor: string
  private _overlayColor: string
  private _lineWidth: number
  private _hitSize: number
  private _disabled = false
  private _motionEnabled = true
  private _isDragging = false
  private _isHover = false
  private _blurSecondY: number | null = null

  //
  private _onChangeStart: (e: MouseEvent) => void = () => {}
  private _onChangeMove: (e: MouseEvent, dy: number) => void = () => {}
  private _onChangeEnd: (e: MouseEvent) => void = () => {}

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    color: string = '#c5c5c5',
    lineWidth: number = 1,
  ) {
    super(app, surface)
    this.__type = 'RowResizer'
    this._color = color
    this._hoverColor = color
    this._activeColor = color
    this._overlayColor = 'rgba(37,99,235,0.14)'
    this._lineWidth = lineWidth
    this._hitSize = Math.max(6, lineWidth)
    this.options({ width: 0, height: this._hitSize })
    this.setupEvents()
  }

  private setupEvents(): void {
    this.on('dragstart', e => {
      if (this._disabled) return false
      this._onChangeStart(e)
      if (e.defaultPrevented) return false
      this._isDragging = true
      if (this._motionEnabled) {
        this.nova.motion.to(this, { scaleY: 1.08, opacity: 0.85 }, resolveNovaUiMotionOptions('pressFeedback'))
      }
      this.nova.invalidate()
      return false
    })

    this.on('dragmove', (e, _dx, dy) => {
      if (this._disabled) return false
      this._onChangeMove(e, dy)
      if (e.defaultPrevented) return false
      this.nova.invalidate()
      return false
    })

    this.on('dragend', e => {
      if (this._disabled) return false
      this._onChangeEnd(e)
      if (e.defaultPrevented) return false
      this._isDragging = false
      if (this._motionEnabled) {
        this.nova.motion.to(this, { scaleY: 1, opacity: 1 }, resolveNovaUiMotionOptions('pressFeedback'))
      }
      this.nova.invalidate()
      return false
    })

    this.on('mouseenter', () => {
      if (this._disabled) return
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

  onChangeStart(handler: (e: MouseEvent) => void): RowResizer<E> {
    this._onChangeStart = handler
    return this
  }

  onChangeMove(handler: (e: MouseEvent, dy: number) => void): RowResizer<E> {
    this._onChangeMove = handler
    return this
  }

  onChangeEnd(handler: (e: MouseEvent) => void): RowResizer<E> {
    this._onChangeEnd = handler
    return this
  }

  options(opts: Partial<ResizerOptions>): this {
    const {
      color,
      hoverColor,
      activeColor,
      overlayColor,
      lineWidth,
      hitSize,
      blurSecondY,
      disabled,
      motion,
      ...rest
    } = opts

    super.options({
      ...rest,
      interactive: disabled === true ? false : true,
      active: disabled === true ? false : true,
      cursor: { hover: 'row-resize', pressed: 'row-resize', dragging: 'row-resize', disabled: 'not-allowed' },
      cursorContext: { axis: 'y', disabled: disabled === true },
    })
    this._color = color ?? this._color
    this._hoverColor = hoverColor ?? this._hoverColor ?? this._color
    this._activeColor = activeColor ?? this._activeColor ?? this._hoverColor
    this._overlayColor = overlayColor ?? this._overlayColor
    this._lineWidth = lineWidth ?? this._lineWidth
    this._hitSize = hitSize ?? this._hitSize
    this._blurSecondY = blurSecondY ?? this._blurSecondY
    this._disabled = disabled ?? this._disabled
    this._motionEnabled = motion !== false
    this.setLocalRenderBounds({ x: 0, y: 0, width: this.width, height: Math.max(this.height, this._hitSize) })
    return this
  }

  render(): void {
    const centerY = this.height / 2

    this.renderer.schema([
      {
        type: 'line',
        x1: 0,
        y1: centerY,
        x2: this.width,
        y2: centerY,
        styles: {
          color: this._isDragging ? this._activeColor : this._isHover ? this._hoverColor : this._color,
          width: this._lineWidth,
          opacity: this._disabled ? 0.45 : 1,
        },
      },
      {
        type: 'rect',
        x: 0,
        y: Math.min(this._blurSecondY || 0, centerY),
        width: this.width,
        height: Math.abs(centerY - (this._blurSecondY || 0)),
        styles: {
          background: this._overlayColor,
        },
        active: this._isDragging && this._blurSecondY !== null,
      },
    ])
  }

  static create<E extends EventList>(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    params: ResizerOptions,
  ): RowResizer<E> {
    const {
      color = '#c5c5c5',
      lineWidth = 1,
      x = 0,
      y = 0,
      width = 0,
      height = 6,
    } = params

    const resizer = new RowResizer<E>(app, surface, color, lineWidth)
    resizer.options(params)
    resizer.setPosition(x, y)
    resizer.setSize(width, height)
    return resizer
  }
}
