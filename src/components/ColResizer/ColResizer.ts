import { NovaNode } from '@endge/nova'
import type { NovaApp } from '@endge/nova'
import type { NovaSurface } from '@endge/nova'
import type { ResizerOptions } from '@/domain/types'
import type { EventList } from '@endge/utils'
import { resolveNovaUiMotionOptions } from '@/shared/motion'

export class ColResizer<E extends EventList> extends NovaNode<E> {
  private color: string
  private hoverColor: string
  private activeColor: string
  private overlayColor: string
  private lineWidth: number
  private hitSize: number
  private isDragging = false
  private isHover = false
  private disabled = false
  private motionEnabled = true
  private _onChangeStart: (e: MouseEvent) => void = () => {}
  private _onChangeMove: (e: MouseEvent, dx: number) => void = () => {}
  private _onChangeEnd: (e: MouseEvent) => void = () => {}

  constructor(
    app: NovaApp<E>,
    surface: NovaSurface<E>,
    color: string = '#c5c5c5',
    lineWidth: number = 1,
  ) {
    super(app, surface)
    this.__type = 'ColResizer'
    this.color = color
    this.hoverColor = color
    this.activeColor = color
    this.overlayColor = 'rgba(37,99,235,0.14)'
    this.lineWidth = lineWidth
    this.hitSize = Math.max(6, lineWidth)
    this.options({ width: this.hitSize, height: 0 })
    this.setupEvents()
  }

  private setupEvents(): void {
    this.on('dragstart', (e) => {
      if (this.disabled) return false
      this._onChangeStart(e)
      if (e.defaultPrevented) {
        return false
      }

      this.isDragging = true
      if (this.motionEnabled) {
        this.nova.motion.to(this, { scaleX: 1.08, opacity: 0.85 }, resolveNovaUiMotionOptions('pressFeedback'))
      }
      this.nova.renderer.cursor('col-resize')
      this.nova.invalidate()
      return false
    })

    this.on('dragmove', (e, dx) => {
      if (this.disabled) return false
      this._onChangeMove(e, dx)
      if (e.defaultPrevented) {
        return false
      }

      this.nova.renderer.cursor('col-resize')
      this.nova.invalidate()
      return false
    })

    this.on('dragend', (e) => {
      if (this.disabled) return false
      this._onChangeEnd(e)
      if (e.defaultPrevented) {
        return false
      }

      this.isDragging = false
      if (this.motionEnabled) {
        this.nova.motion.to(this, { scaleX: 1, opacity: 1 }, resolveNovaUiMotionOptions('pressFeedback'))
      }
      this.nova.renderer.cursor('default')
      this.nova.invalidate()
      return false
    })

    this.on('mouseenter', () => {
      if (this.disabled) return
      this.isHover = true
      this.nova.renderer.cursor('col-resize')
      this.nova.invalidate()
    })

    this.on('mouseleave', () => {
      this.isHover = false
      if (!this.isDragging) {
        this.nova.renderer.cursor('default')
        this.nova.invalidate()
      }
    })
  }

  onChangeStart(handler: (e: MouseEvent) => void): ColResizer<E> {
    this._onChangeStart = handler
    return this
  }

  onChangeMove(handler: (e: MouseEvent, dx: number) => void): ColResizer<E> {
    this._onChangeMove = handler
    return this
  }

  onChangeEnd(handler: (e: MouseEvent) => void): ColResizer<E> {
    this._onChangeEnd = handler
    return this
  }

  render(): void {
    const centerX = this.width / 2
    const y1 = 0
    const y2 = this.height

    this.renderer.schema([
      {
        type: 'line',
        x1: centerX,
        y1: y1,
        x2: centerX,
        y2: y2,
        styles: {
          color: this.isDragging ? this.activeColor : this.isHover ? this.hoverColor : this.color,
          width: this.lineWidth,
          opacity: this.disabled ? 0.45 : 1,
        },
      },
      {
        type: 'rect',
        x: Math.min(0, centerX),
        y: 0,
        width: Math.max(0, centerX),
        height: this.height,
        styles: { background: this.overlayColor },
        active: this.isDragging,
      },
    ])
  }

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
      interactive: disabled === true ? false : true,
      active: disabled === true ? false : true,
    })
    this.color = color ?? this.color
    this.hoverColor = hoverColor ?? this.hoverColor ?? this.color
    this.activeColor = activeColor ?? this.activeColor ?? this.hoverColor
    this.overlayColor = overlayColor ?? this.overlayColor
    this.lineWidth = lineWidth ?? this.lineWidth
    this.hitSize = hitSize ?? this.hitSize
    this.disabled = disabled ?? this.disabled
    this.motionEnabled = motion !== false
    this.setLocalRenderBounds({ x: 0, y: 0, width: Math.max(this.width, this.hitSize), height: this.height })
    return this
  }

  // --- Новый статический метод для создания ресайзера ---
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
