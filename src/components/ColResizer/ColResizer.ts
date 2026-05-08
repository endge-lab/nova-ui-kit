import { NovaNode } from '@endge/nova'
import type { NovaApp } from '@endge/nova'
import type { NovaSurface } from '@endge/nova'
import type { ResizerOptions } from '@/domain/types'
import type { EventList } from '@endge/utils'

export class ColResizer<E extends EventList> extends NovaNode<E> {
  private color: string
  private lineWidth: number
  private isDragging = false
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
    this.color = color
    this.lineWidth = lineWidth
    this.setupEvents()
  }

  private setupEvents(): void {
    this.on('dragstart', (e) => {
      this._onChangeStart(e)
      if (e.defaultPrevented) {
        return false
      }

      this.isDragging = true
      this.nova.renderer.cursor('col-resize')
      this.nova.invalidate()
      return false
    })

    this.on('dragmove', (e, dx) => {
      this._onChangeMove(e, dx)
      if (e.defaultPrevented) {
        return false
      }

      this.nova.renderer.cursor('col-resize')
      this.nova.invalidate()
      return false
    })

    this.on('dragend', (e) => {
      this._onChangeEnd(e)
      if (e.defaultPrevented) {
        return false
      }

      this.isDragging = false
      this.nova.renderer.cursor('default')
      this.nova.invalidate()
      return false
    })

    this.on('mouseenter', () => {
      this.nova.renderer.cursor('col-resize')
      this.nova.invalidate()
    })

    this.on('mouseleave', () => {
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
          color: this.color,
          width: this.lineWidth,
        },
      },
    ])
  }

  options(opts: Partial<ResizerOptions>): this {
    super.options(opts)
    this.color = opts.color || this.color
    this.lineWidth = opts.lineWidth || this.lineWidth
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
    resizer.setPosition(x, y)
    resizer.setSize(width, height)
    resizer.color = params.color
    return resizer
  }
}
