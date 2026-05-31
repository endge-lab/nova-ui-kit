// @vitest-environment jsdom

import {
  Nova,
  RaphSchedulerType,
  RendererType,
} from '@endge/nova'
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  NovaUIKit,
  registerNovaUIKit,
  type InputApi,
} from '@/index'
import { normalizeInputProps } from '@/components/Input/input.config'
import {
  INPUT_DESCRIPTORS,
  INPUT_DESCRIPTOR,
  NUMBER_INPUT_DESCRIPTOR,
  TEXT_AREA_DESCRIPTOR,
} from '@/components/Input/input.registry'

describe('Nova UI Kit input components', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes common input defaults', () => {
    const props = normalizeInputProps({ placeholder: 'Name' })

    expect(props.inputEngine).toBe('auto')
    expect(props.placeholder).toBe('Name')
    expect(props.variant).toBe('default')
    expect(props.validation).toBe('onBlur')
    expect(props.clearable).toBe(false)
  })

  it('normalizes search, number and textarea specifics', () => {
    expect(normalizeInputProps({}, 'search').clearable).toBe(true)
    expect(normalizeInputProps({ step: 5 }, 'number').step).toBe(5)
    expect(normalizeInputProps({ minRows: 2, maxRows: 5 }, 'textarea')).toMatchObject({
      minRows: 2,
      maxRows: 5,
      wrap: true,
    })
  })

  it('registers all input descriptors through UI Kit registration', () => {
    const registered: Array<string> = []
    const registry = {
      reserveTag: (_name: string) => {},
      register: (descriptor: any) => registered.push(descriptor.type),
    }

    registerNovaUIKit(registry as any)

    for (const descriptor of INPUT_DESCRIPTORS) {
      expect(registered).toContain(descriptor.type)
    }
    expect(NovaUIKit.Input).toBe(INPUT_DESCRIPTOR.type)
    expect(NovaUIKit.NumberInput).toBe(NUMBER_INPUT_DESCRIPTOR.type)
    expect(NovaUIKit.TextArea).toBe(TEXT_AREA_DESCRIPTOR.type)
  })

  it('places caret and insertion index on the rendered centered proportional text', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: string) => {
      if (type === RendererType.Web2D || type === '2d') return create2DContextStub({ W: 12, i: 3, '.': 4, X: 9 })
      return null
    })
    const canvas = document.createElement('canvas')
    const app = Nova.createApp({
      target: canvas,
      size: { width: 220, height: 80, dpr: 1 },
      renderer: { main: RendererType.Web2D },
      scheduler: { type: RaphSchedulerType.Sync, loop: false },
    })
    registerNovaUIKit(app.schema)
    const surface = app.createSurface('ui')
    app.schema.createNode(surface, {
      type: NovaUIKit.TextInput,
      id: 'centered-input',
      props: {
        value: 'Wi.',
        x: 0,
        y: 0,
        width: 120,
        height: 34,
        inputEngine: 'canvas',
        align: 'center',
        fontSize: 12,
        lineHeight: 18,
      },
    })
    app.raph.run()

    const api = app.components.requireApi<InputApi>('centered-input')
    api.select(2, 2)
    expect(api.getCaretRect().x).toBeCloseTo(65.5)

    app.handleEvent('mousedown', new MouseEvent('mousedown', { clientX: 65.6, clientY: 17, button: 0 }))
    app.handleEvent('mouseup', new MouseEvent('mouseup', { clientX: 65.6, clientY: 17, button: 0 }))
    app.handleEvent('keydown', new KeyboardEvent('keydown', { key: 'X' }))
    app.raph.run()

    expect(api.getState().draft).toBe('WiX.')
    expect(api.getSelection()).toEqual({ start: 3, end: 3 })
    app.destroy()
  })
})

function create2DContextStub(widths: Record<string, number>): CanvasRenderingContext2D {
  const state: Record<PropertyKey, any> = {
    measureText: vi.fn((text: string) => ({ width: Array.from(text).reduce((sum, char) => sum + (widths[char] ?? char.length * 6), 0) })),
    createPattern: vi.fn(() => ({})),
  }
  return new Proxy(state, {
    /**
     * Возвращает значение состояния CanvasRenderingContext2D stub.
     */
    get(target, prop) {
      if (!(prop in target)) target[prop] = vi.fn()
      return target[prop]
    },
    /**
     * Обновляет значение состояния CanvasRenderingContext2D stub.
     */
    set(target, prop, value) {
      target[prop] = value
      return true
    },
  }) as CanvasRenderingContext2D
}
