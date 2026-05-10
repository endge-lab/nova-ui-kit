import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  clamp,
  commonMeasureBounds,
  finiteNumber,
  normalizeCommonProps,
  roundToStep,
} from '@/shared/component'
import {
  SLIDER_SCHEMA_TYPE,
  type SliderApi,
  type SliderProps,
  type SliderResolvedProps,
} from '@/components/Slider/Slider.types'

export type SliderDescriptor = NovaComponentDescriptor<SliderResolvedProps, SliderApi, Record<string, never>, SliderProps>

export type SliderNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<SliderProps>,
) => NovaComponentNode<SliderResolvedProps, SliderApi, Record<string, never>, SliderProps, E>

export const SLIDER_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  min: { type: 'number' },
  max: { type: 'number' },
  step: { type: 'number' },
  value: { type: 'number' },
  orientation: { type: 'string' },
  marks: { type: 'array' },
  onChange: { type: 'function' },
} as const

export function normalizeSliderProps(props: SliderProps = {}): SliderResolvedProps {
  const min = finiteNumber(props.min, 0)
  const max = Math.max(min, finiteNumber(props.max, 100))
  const step = Math.max(0, finiteNumber(props.step, 1))
  const value = clamp(roundToStep(finiteNumber(props.value, min), min, step), min, max)
  const orientation = props.orientation ?? 'horizontal'
  const cursor = orientation === 'horizontal' ? 'ew-resize' : 'ns-resize'

  return {
    ...normalizeCommonProps(props, {
      width: 180,
      height: 32,
      accentColor: '#2563eb',
      trackColor: '#dbe4ef',
      thumbColor: '#ffffff',
      border: { color: '#2563eb', width: 2, radius: 999 },
      cursor: { hover: cursor, pressed: cursor, dragging: cursor, disabled: 'not-allowed' },
    }),
    min,
    max,
    step,
    value,
    orientation,
    marks: props.marks ?? [],
    onChange: props.onChange,
  }
}

export function createSliderDescriptor(createNode?: SliderNodeFactory): SliderDescriptor {
  const descriptor: SliderDescriptor = {
    type: SLIDER_SCHEMA_TYPE,
    name: 'Slider',
    title: 'Slider',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'min', 'max', 'step', 'orientation', 'marks'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'value', 'onChange'],
    },
    fields: SLIDER_FIELD_DEFINITIONS,
    normalize: schema => normalizeSliderProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeSliderProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const SLIDER_NODE_DESCRIPTOR = createSliderDescriptor()
