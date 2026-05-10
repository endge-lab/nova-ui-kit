import { NovaNode } from '@endge/nova'
import type { NovaApp } from '@endge/nova'
import type { NovaSurface } from '@endge/nova'
import type { EventList } from '@endge/utils'
import type { LazyResizerOptions } from '@/domain/domain.types'
import type { Side } from '@endge/utils'
import type { NovaSchemaItem } from '@endge/nova'
import { resolveNovaUiMotionOptions } from '@/shared/motion'

export class LazyResizer<E extends EventList> extends NovaNode<E> {
  private _isDragging = false
  private _isHover = false
  private _direction: Side = 'top'
  private _color: string = '#000'
  private _lineWidth: number = 1
  private _lineWidthHover: number = 10
  private _activeOverlayColor: string = 'rgba(26,75,179,0.2)'
  private _motionLineWidth: number | null = null
  private _motionColor: string | null = null
  private _overlayOpacity = 0
  private _minSize: number = 20
  private _maxSize: number = Infinity
  private _motionEnabled = true

  private _initialX = 0
  private _initialY = 0
  private _initialWidth = 0
  private _initialHeight = 0

  private _onChangeStart: (e: MouseEvent) => void = () => {}
  private _onChangeMove: (e: MouseEvent, delta: number) => void = () => {}
  private _onChangeEnd: (e: MouseEvent, size: number) => void = () => {}

  constructor(app: NovaApp<E>, surface: NovaSurface<E>, opts: LazyResizerOptions) {
    super(app, surface)
    this.__type = 'LazyResizer'
    this.options(opts)
    this.setupEvents()
  }

  get isDragging(): boolean {
    return this._isDragging
  }

  options(opts: Partial<LazyResizerOptions>): this {
    const { color, direction, activeOverlayColor, lineWidth, minSize, maxSize, lineWidthHover, motion, ...rest } = opts
    this._color = color ?? this._color
    this._direction = direction ?? this._direction
    this._activeOverlayColor = activeOverlayColor ?? this._activeOverlayColor
    this._lineWidth = lineWidth ?? this._lineWidth
    this._lineWidthHover = lineWidthHover ?? this._lineWidthHover
    this._minSize = minSize ?? this._minSize
    this._maxSize = maxSize ?? this._maxSize
    this._motionEnabled = motion !== false

    super.options({
      ...rest,
      interactive: true,
      active: true,
      cursor: {
        hover: this.getCursorByDirection(),
        pressed: this.getCursorByDirection(),
        dragging: this.getCursorByDirection(),
      },
      cursorContext: {
        axis: this._direction === 'left' || this._direction === 'right' ? 'x' : 'y',
      },
    })
    this.updateHitBounds()
    return this
  }

  private updateHitBounds(): void {
    const size = this._lineWidthHover

    switch (this._direction) {
      case 'top':
        this.setLocalRenderBounds({ x: 0, y: 0, width: this.width, height: size })
        break
      case 'bottom':
        this.setLocalRenderBounds({ x: 0, y: Math.max(0, this.height - size), width: this.width, height: size })
        break
      case 'left':
        this.setLocalRenderBounds({ x: 0, y: 0, width: size, height: this.height })
        break
      case 'right':
        this.setLocalRenderBounds({ x: Math.max(0, this.width - size), y: 0, width: size, height: this.height })
        break
    }
  }

  private setupEvents(): void {
    this.on('dragstart', (e, meta: { startX: number; startY: number }) => {
      e.stopPropagation()

      if ((this._direction === 'top' || this._direction === 'bottom') && this.height < this._minSize) {
        this.height = this._minSize
      }
      if ((this._direction === 'left' || this._direction === 'right') && this.width < this._minSize) {
        this.width = this._minSize
      }
      if ((this._direction === 'top' || this._direction === 'bottom') && this.height > this._maxSize) {
        this.height = this._maxSize
      }
      if ((this._direction === 'left' || this._direction === 'right') && this.width > this._maxSize) {
        this.width = this._maxSize
      }

      const [lx, ly] = this.toLocal(meta.startX, meta.startY)

      let isNearLine = false
      switch (this._direction) {
        case 'top':
          isNearLine = ly >= 0 && ly <= this._lineWidthHover && lx >= 0 && lx <= this.width
          break
        case 'bottom':
          isNearLine = Math.abs(ly - this.height) <= this._lineWidthHover && lx >= 0 && lx <= this.width
          break
        case 'left':
          isNearLine = Math.abs(lx) <= this._lineWidthHover && ly >= 0 && ly <= this.height
          break
        case 'right':
          isNearLine = Math.abs(lx - this.width) <= this._lineWidthHover && ly >= 0 && ly <= this.height
          break
      }

      if (!isNearLine) return false

      this._initialX = this.x
      this._initialY = this.y
      this._initialWidth = this.width
      this._initialHeight = this.height

      this._onChangeStart(e)
      if (e.defaultPrevented) return false

      this._isDragging = true
      this.animateDragOverlay(1)
      this.dirty({ render: true })
      return false
    })

    this.on('dragmove', (e, dx, dy) => {
      if (!this._isDragging) return false
      const delta = this._direction === 'left' || this._direction === 'right' ? dx : dy

      switch (this._direction) {
        case 'left': {
          const newWidth = this.width - delta
          const newX = this.x + delta
          if (newWidth < this._minSize || newWidth > this._maxSize) return false
          this.x = newX
          this.width = newWidth
          break
        }
        case 'right': {
          const newWidth = this.width + delta
          if (newWidth < this._minSize || newWidth > this._maxSize) return false
          this.width = newWidth
          break
        }
        case 'top': {
          const newHeight = this.height - delta
          const newY = this.y + delta
          if (newHeight < this._minSize || newHeight > this._maxSize) return false
          this.y = newY
          this.height = newHeight
          break
        }
        case 'bottom': {
          const newHeight = this.height + delta
          if (newHeight < this._minSize || newHeight > this._maxSize) return false
          this.height = newHeight
          break
        }
      }

      this._onChangeMove(e, delta)
      if (e.defaultPrevented) return false
      this.dirty({ render: true })
      return false
    })

    const dragEnd = (e: MouseEvent) => {
      if (!this._isDragging) return false

      let isValid = true

      switch (this._direction) {
        case 'left': {
          const newWidth = this.width
          const delta = this._initialWidth - newWidth
          if (delta > 0 && newWidth < this._minSize) isValid = false
          break
        }
        case 'right': {
          const newWidth = this.width
          const delta = newWidth - this._initialWidth
          if (delta > 0 && newWidth > this._maxSize) isValid = false
          break
        }
        case 'top': {
          const newHeight = this.height
          const delta = this._initialHeight - newHeight
          if (delta > 0 && newHeight < this._minSize) isValid = false
          break
        }
        case 'bottom': {
          const newHeight = this.height
          const delta = newHeight - this._initialHeight
          if (delta > 0 && newHeight > this._maxSize) isValid = false
          break
        }
      }

      if (!isValid) {
        this.x = this._initialX
        this.y = this._initialY
        this.width = this._initialWidth
        this.height = this._initialHeight
      }

      const newSize = this._direction === 'left' || this._direction === 'right' ? this.width : this.height
      this._onChangeEnd(e, newSize + this._lineWidthHover)
      if (e.defaultPrevented) return false

      this._isDragging = false
      this.animateDragOverlay(0)
      this.dirty({ render: true })
      return false
    }

    this.on('dragend', dragEnd)

    this.on('canvasleave', dragEnd)
    this.on('canvasenter', () => this.resetState())

    this.on('mousemove', (event: MouseEvent) => {
      const { x: gx, y: gy } = this.events.getCanvasMousePosition(event)
      const [lx, ly] = this.toLocal(gx, gy)

      let isNearLine = false
      switch (this._direction) {
        case 'top':
          isNearLine = ly >= 0 && ly <= this._lineWidthHover && lx >= 0 && lx <= this.width
          break
        case 'bottom':
          isNearLine = Math.abs(ly - this.height) <= this._lineWidthHover && lx >= 0 && lx <= this.width
          break
        case 'left':
          isNearLine = Math.abs(lx) <= this._lineWidthHover && ly >= 0 && ly <= this.height
          break
        case 'right':
          isNearLine = Math.abs(lx - this.width) <= this._lineWidthHover && ly >= 0 && ly <= this.height
          break
      }

      this._isHover = isNearLine
      this.animateHoverLine(isNearLine)
      this.dirty({ render: true })
    })

    this.on('mouseleave', () => {
      this._isHover = false
      this.animateHoverLine(false)
      this.dirty({ render: true })
    })
  }

  private resetState(): void {
    if (!this._isDragging) return
    this.x = this._initialX
    this.y = this._initialY
    this.width = this._initialWidth
    this.height = this._initialHeight
    this._isDragging = false
    this._isHover = false
    this._overlayOpacity = 0
    this._motionLineWidth = null
    this.dirty({ render: true })
  }

  get motionLineWidth(): number {
    return this._motionLineWidth ?? this._lineWidth
  }

  set motionLineWidth(value: number) {
    this._motionLineWidth = value
  }

  get motionColor(): string {
    return this._motionColor ?? this._color
  }

  set motionColor(value: string) {
    this._motionColor = value
  }

  get overlayOpacity(): number {
    return this._overlayOpacity
  }

  set overlayOpacity(value: number) {
    this._overlayOpacity = Math.max(0, Math.min(1, value))
  }

  onChangeStart(handler: (e: MouseEvent) => void): LazyResizer<E> {
    this._onChangeStart = handler
    return this
  }

  onChangeMove(handler: (e: MouseEvent, delta: number) => void): LazyResizer<E> {
    this._onChangeMove = handler
    return this
  }

  onChangeEnd(handler: (e: MouseEvent, size: number) => void): LazyResizer<E> {
    this._onChangeEnd = handler
    return this
  }

  render(): void {
    const t = this._lineWidthHover
    const lineWidth = this._motionLineWidth ?? (this._isHover ? this._lineWidthHover : this._lineWidth)
    const halfWidth = lineWidth / 2

    const styles = {
      color: this._motionColor ?? this._color,
      width: lineWidth,
    }

    const line: NovaSchemaItem = (() => {
      switch (this._direction) {
        case 'left':
          return {
            type: 'line',
            x1: halfWidth,
            y1: 0,
            x2: halfWidth,
            y2: this.height,
            styles,
          }
        case 'right':
          return {
            type: 'line',
            x1: this.width - halfWidth,
            y1: 0,
            x2: this.width - halfWidth,
            y2: this.height,
            styles,
          }
        case 'top':
          return {
            type: 'line',
            x1: 0,
            y1: halfWidth,
            x2: this.width,
            y2: halfWidth,
            styles,
          }
        case 'bottom':
          return {
            type: 'line',
            x1: 0,
            y1: this.height - halfWidth,
            x2: this.width,
            y2: this.height - halfWidth,
            styles,
          }
      }
    })()

    const rect: NovaSchemaItem = (() => {
      switch (this._direction) {
        case 'left':
        case 'right':
          return {
            type: 'rect',
            x: -t,
            y: 0,
            width: this.width + t,
            height: this.height,
            styles: { background: this._activeOverlayColor, opacity: this._overlayOpacity },
            active: this._isDragging || this._overlayOpacity > 0,
          }
        case 'top':
          return {
            type: 'rect',
            x: 0,
            y: t,
            width: this.width,
            height: this.height - t,
            styles: { background: this._activeOverlayColor, opacity: this._overlayOpacity },
            active: this._isDragging || this._overlayOpacity > 0,
          }
        case 'bottom':
          return {
            type: 'rect',
            x: 0,
            y: 0,
            width: this.width,
            height: this.height - t,
            styles: { background: this._activeOverlayColor, opacity: this._overlayOpacity },
            active: this._isDragging || this._overlayOpacity > 0,
          }
      }
    })()

    this.renderer.schema([line, rect])
  }

  private animateHoverLine(active: boolean): void {
    if (!this._motionEnabled) {
      this._motionLineWidth = active ? this._lineWidthHover : this._lineWidth
      return
    }

    this.nova.motion.to(this, {
      motionLineWidth: active ? this._lineWidthHover : this._lineWidth,
      motionColor: active ? '#4f7cff' : this._color,
    }, resolveNovaUiMotionOptions('hoverLine'))
  }

  private animateDragOverlay(opacity: number): void {
    if (!this._motionEnabled) {
      this._overlayOpacity = opacity
      return
    }

    this.nova.motion.to(this, {
      overlayOpacity: opacity,
    }, resolveNovaUiMotionOptions('dragOverlay'))
  }

  private getCursorByDirection(): string {
    switch (this._direction) {
      case 'top':
      case 'bottom':
        return 'row-resize'
      case 'left':
      case 'right':
        return 'col-resize'
      default:
        return 'default'
    }
  }
}
