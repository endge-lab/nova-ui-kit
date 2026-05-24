import type { NovaSchema } from '@endge/nova'

export interface ProgressRingSchemaOptions {
  x: number
  y: number
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  opacity?: number
  lineCap?: 'butt' | 'round' | 'square'
}

const FULL_CIRCLE = Math.PI * 2
const START_ANGLE = -Math.PI / 2

export function createProgressRingSchema(options: ProgressRingSchemaOptions): NovaSchema {
  const size = Math.max(1, options.size ?? 18)
  const strokeWidth = Math.max(1, Math.min(size, options.strokeWidth ?? 2))
  const value = Math.max(0, Math.min(100, options.value))
  const radius = Math.max(0.5, (size - strokeWidth) / 2)
  const centerX = options.x + size / 2
  const centerY = options.y + size / 2
  const opacity = options.opacity ?? 1
  const schema: NovaSchema = [
    {
      type: 'arc',
      x: centerX,
      y: centerY,
      radius,
      startAngle: START_ANGLE,
      endAngle: START_ANGLE + FULL_CIRCLE,
      styles: {
        color: options.trackColor ?? '#e7edf5',
        width: strokeWidth,
        opacity,
      },
    },
  ]

  if (value > 0) {
    schema.push({
      type: 'arc',
      x: centerX,
      y: centerY,
      radius,
      startAngle: START_ANGLE,
      endAngle: START_ANGLE + FULL_CIRCLE * (value / 100),
      styles: {
        color: options.color ?? '#2786f6',
        width: strokeWidth,
        lineCap: options.lineCap ?? 'round',
        opacity,
      },
    })
  }

  return schema
}
