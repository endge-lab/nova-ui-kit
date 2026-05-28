import type {
  NovaComponentCreateContext,
  NovaComponentDescriptor,
  NovaComponentNode,
  NovaComponentSchema,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  FPS_METER_SCHEMA_TYPE,
  type FpsMeterApi,
  type FpsMeterProps,
  type FpsMeterResolvedProps,
} from '@/components/FpsMeter/fps-meter.types'
import { resolveNovaUiPosition } from '@/shared/layout'

export type FpsMeterDescriptor = NovaComponentDescriptor<
  FpsMeterResolvedProps,
  FpsMeterApi,
  Record<string, never>,
  FpsMeterProps
>

export type FpsMeterNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<FpsMeterProps>,
) => NovaComponentNode<FpsMeterResolvedProps, FpsMeterApi, Record<string, never>, FpsMeterProps, E>

export const FPS_METER_FIELD_DEFINITIONS = {
  x: { type: 'number' },
  y: { type: 'number' },
  width: { type: 'number' },
  height: { type: 'number' },
  position: { type: 'string' },
  inset: { type: 'spacing' },
  zIndex: { type: 'number' },
  placement: { type: 'string' },
  margin: { type: 'number' },
  sampleSize: { type: 'number' },
  variant: { type: 'string' },
  visible: { type: 'boolean' },
} as const

export function normalizeFpsMeterProps(props: FpsMeterProps = {}): FpsMeterResolvedProps {
  return {
    x: props.x,
    y: props.y,
    width: finiteNumber(props.width, props.variant === 'minimal' ? 48 : 86),
    height: finiteNumber(props.height, props.variant === 'minimal' ? 22 : 36),
    position: resolveNovaUiPosition(props.position),
    inset: props.inset,
    zIndex: finiteOptionalNumber(props.zIndex, 2000),
    placement: props.placement,
    margin: finiteNumber(props.margin, 12),
    sampleSize: Math.max(2, Math.round(finiteNumber(props.sampleSize, 30))),
    variant: props.variant ?? 'pill',
    visible: props.visible ?? true,
  }
}

export function createFpsMeterDescriptor(createNode?: FpsMeterNodeFactory): FpsMeterDescriptor {
  const descriptor: FpsMeterDescriptor = {
    type: FPS_METER_SCHEMA_TYPE,
    name: 'FpsMeter',
    title: 'FPS Meter',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: ['x', 'y', 'placement', 'margin', 'zIndex'],
      update: ['width', 'height', 'position', 'inset', 'variant', 'visible'],
      render: ['sampleSize'],
    },
    fields: FPS_METER_FIELD_DEFINITIONS,
    normalize: schema => normalizeFpsMeterProps(schema.props),
    measureBounds: (_context, schema) => {
      const props = normalizeFpsMeterProps(schema.props)
      return { x: props.x ?? 0, y: props.y ?? 0, width: props.width, height: props.height }
    },
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const FPS_METER_NODE_DESCRIPTOR = createFpsMeterDescriptor()

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function finiteOptionalNumber(value: unknown, fallback?: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
