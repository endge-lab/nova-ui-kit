import { describe, expect, it } from 'vitest'
import { createProgressRingSchema } from '@/components/ProgressRing/progress-ring.schema'

describe('ProgressRing schema', () => {
  it('builds track and value arcs from percent value', () => {
    const schema = createProgressRingSchema({
      x: 10,
      y: 20,
      size: 16,
      value: 75,
      strokeWidth: 2,
      color: '#10b981',
      trackColor: '#e7edf5',
    })

    expect(schema).toHaveLength(2)
    expect(schema[0]).toMatchObject({
      type: 'arc',
      x: 18,
      y: 28,
      radius: 7,
      styles: {
        color: '#e7edf5',
        width: 2,
      },
    })
    expect(schema[1]).toMatchObject({
      type: 'arc',
      x: 18,
      y: 28,
      radius: 7,
      styles: {
        color: '#10b981',
        width: 2,
        lineCap: 'round',
      },
    })
  })

  it('clamps empty values to track only', () => {
    const schema = createProgressRingSchema({
      x: 0,
      y: 0,
      value: -20,
    })

    expect(schema).toHaveLength(1)
    expect(schema[0]?.type).toBe('arc')
  })
})
