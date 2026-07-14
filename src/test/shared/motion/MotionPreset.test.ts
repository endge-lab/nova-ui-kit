import { describe, expect, it } from 'vitest'
import { isNovaUiMotionEnabled, resolveNovaUiMotionOptions } from '@/shared/motion'

describe('Nova UI motion presets', () => {
  it('resolves default preset options', () => {
    expect(resolveNovaUiMotionOptions('fadeIn')).toMatchObject({
      duration: 180,
      easing: 'outCubic',
    })
  })

  it('supports opt-out with motion false', () => {
    expect(isNovaUiMotionEnabled({ motion: false })).toBe(false)
    expect(isNovaUiMotionEnabled({ motion: 'fadeIn' })).toBe(true)
  })
})
