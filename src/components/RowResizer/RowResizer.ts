import { NovaNode } from '@endge/nova'
import type { NovaApp } from '@endge/nova'
import type { NovaSurface } from '@endge/nova'
import type { ResizerOptions } from '@/domain/types'
import type { EventList } from '@endge/utils'

export class RowResizer<E extends EventList> extends NovaNode<E> {
  //
  private _color: string
  private _lineWidth: number
  private _isDragging = false
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
    this._color = color
    this._lineWidth = lineWidth
    this.setupEvents()
  }

  private setupEvents(): void {
    this.on('dragstart', (e) => {
      this._onChangeStart(e)
      if (e.defaultPrevented) return false
      this._isDragging = true
      this.nova.renderer.cursor('row-resize')
      this.nova.invalidate()
      return false
    })

    this.on('dragmove', (e, _dx, dy) => {
      this._onChangeMove(e, dy)
      if (e.defaultPrevented) return false

      this.nova.renderer.cursor('row-resize')
      this.nova.invalidate()
      return false
    })

    this.on('dragend', (e) => {
      this._onChangeEnd(e)
      if (e.defaultPrevented) return false
      this._isDragging = false
      this.nova.renderer.cursor('default')
      this.nova.invalidate()
      return false
    })

    this.on('mouseenter', () => {
      this.nova.renderer.cursor('row-resize')
      this.nova.invalidate()
    })

    this.on('mouseleave', () => {
      if (!this._isDragging) {
        this.nova.renderer.cursor('default')
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
    super.options(opts)
    this._color = opts.color || this._color
    this._lineWidth = opts.lineWidth || this._lineWidth
    this._blurSecondY = opts.blurSecondY || this._blurSecondY
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
          color: this._color,
          width: this._lineWidth,
        },
      },
      {
        type: 'rect',
        x: 0,
        y: Math.min(this._blurSecondY || 0, centerY),
        width: this.width,
        height: Math.abs(centerY - (this._blurSecondY || 0)),
        styles: {
          background: 'rgba(0,0,0,0.3)',
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
    resizer.setPosition(x, y)
    resizer.setSize(width, height)
    return resizer
  }
}
