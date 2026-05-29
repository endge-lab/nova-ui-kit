import type {
  NovaComponentCreateContext,
  NovaComponentDescriptor,
  NovaComponentNode,
  NovaComponentSchema,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  clamp,
  commonMeasureBounds,
  finiteNumber,
  normalizeCommonProps,
} from '@/shared/component'
import {
  ZOOM_CONTROLS_SCHEMA_TYPE,
  type ZoomControlsApi,
  type ZoomControlsProps,
  type ZoomControlsResolvedProps,
} from '@/components/ZoomControls/zoom-controls.types'

export type ZoomControlsDescriptor = NovaComponentDescriptor<
  ZoomControlsResolvedProps,
  ZoomControlsApi,
  Record<string, never>,
  ZoomControlsProps
>

export type ZoomControlsNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<ZoomControlsProps>,
) => NovaComponentNode<ZoomControlsResolvedProps, ZoomControlsApi, Record<string, never>, ZoomControlsProps, E>

export const ZOOM_CONTROLS_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  value: { type: 'number' },
  minZoom: { type: 'number' },
  maxZoom: { type: 'number' },
  step: { type: 'number' },
  showValue: { type: 'boolean' },
  valueWidth: { type: 'number' },
  minusLabel: { type: 'string' },
  plusLabel: { type: 'string' },
  formatValue: { type: 'function' },
  onChange: { type: 'function' },
} as const

export function normalizeZoomControlsProps(props: ZoomControlsProps = {}): ZoomControlsResolvedProps {
  const minZoom = finiteNumber(props.minZoom, 0.1)
  const maxZoom = Math.max(minZoom, finiteNumber(props.maxZoom, 3))
  const step = Math.max(0.001, finiteNumber(props.step, 0.2))
  const showValue = props.showValue ?? true
  const valueWidth = Math.max(0, finiteNumber(props.valueWidth, 50))
  const buttonWidth = 36
  const width = buttonWidth * 2 + (showValue ? valueWidth : 0)

  return {
    ...normalizeCommonProps(props, {
      width,
      height: 36,
      background: 'var(--nova-zoom-controls-background, #ffffff)',
      color: 'var(--nova-zoom-controls-color, #172033)',
      border: { color: 'var(--nova-zoom-controls-border-color, #cbd5e1)', width: 1, radius: 7 },
      hoverBackground: 'var(--nova-zoom-controls-button-hover-background, #f8fafc)',
      pressedBackground: 'var(--nova-zoom-controls-button-pressed-background, #eef2f7)',
      cursor: { hover: 'pointer', pressed: 'pointer', disabled: 'not-allowed' },
    }),
    value: clamp(finiteNumber(props.value, 1), minZoom, maxZoom),
    minZoom,
    maxZoom,
    step,
    showValue,
    valueWidth,
    minusLabel: props.minusLabel ?? '-',
    plusLabel: props.plusLabel ?? '+',
    formatValue: props.formatValue,
    onChange: props.onChange,
  }
}

export function createZoomControlsDescriptor(createNode?: ZoomControlsNodeFactory): ZoomControlsDescriptor {
  const descriptor: ZoomControlsDescriptor = {
    type: ZOOM_CONTROLS_SCHEMA_TYPE,
    name: 'ZoomControls',
    title: 'Zoom Controls',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'showValue', 'valueWidth'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'value', 'minZoom', 'maxZoom', 'step', 'minusLabel', 'plusLabel', 'formatValue', 'onChange'],
    },
    fields: ZOOM_CONTROLS_FIELD_DEFINITIONS,
    normalize: schema => normalizeZoomControlsProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeZoomControlsProps),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const ZOOM_CONTROLS_NODE_DESCRIPTOR = createZoomControlsDescriptor()
