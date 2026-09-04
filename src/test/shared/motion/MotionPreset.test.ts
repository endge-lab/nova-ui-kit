import { describe, expect, it } from 'vitest'
import { isNovaUiMotionEnabled, resolveNovaUiMotionOptions } from '@/shared/motion'

describe('проверка Presets движения Nova UI', () => {
  it('разрешает стандартные параметры preset', () => {
    expect(resolveNovaUiMotionOptions('fadeIn')).toMatchObject({
      duration: 180,
      easing: 'outCubic',
    })
  })

  it('поддерживает отключение через motion=false', () => {
    expect(isNovaUiMotionEnabled({ motion: false })).toBe(false)
    expect(isNovaUiMotionEnabled({ motion: 'fadeIn' })).toBe(true)
  })
})
