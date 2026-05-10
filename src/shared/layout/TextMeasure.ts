import type { TextBlockMeasureFn } from '@/components/TextBlock/TextBlock.types'

let measureCanvas: HTMLCanvasElement | null = null

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  measureCanvas ??= document.createElement('canvas')
  return measureCanvas.getContext('2d')
}

export function measureNovaUiTextWidth(text: string, options: Parameters<TextBlockMeasureFn>[1]): number {
  const context = getMeasureContext()
  if (!context) return Math.ceil(text.length * options.fontSize * 0.6)

  context.font = `${options.fontStyle} ${options.fontWeight} ${options.fontSize}px ${options.fontFamily}`
  return Math.ceil(context.measureText(text).width)
}
