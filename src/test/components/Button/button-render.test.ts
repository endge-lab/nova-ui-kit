import { describe, expect, it } from 'vitest'
import { buildButtonSchema } from '@/components/Button/button-render'
import { normalizeButtonProps } from '@/components/Button/button.config'
import { EMPTY_STYLE_CONTEXT } from '@/shared/style'

describe('button render schema', () => {
  it('clamps icon-only glyph to button bounds', () => {
    const schema = buildButtonSchema(normalizeButtonProps({
      width: 12,
      height: 10,
      icon: 'settings',
      iconPlacement: 'only',
    }), 12, 10, EMPTY_STYLE_CONTEXT)
    const icon = schema.find(item => item.type === 'icon')
    expect(icon).toBeUndefined()
  })

  it('keeps icon-only glyph inside content box', () => {
    const schema = buildButtonSchema(normalizeButtonProps({
      width: 36,
      height: 36,
      icon: 'settings',
      iconPlacement: 'only',
    }), 36, 36, EMPTY_STYLE_CONTEXT)
    const icon = schema.find(item => item.type === 'icon')
    expect(icon).toMatchObject({
      x: 12,
      y: 12,
      width: 12,
      height: 12,
    })
  })
})
