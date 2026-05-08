import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  normalizeCommonProps,
} from '@/shared/component'
import {
  PANEL_SCHEMA_TYPE,
  type PanelApi,
  type PanelProps,
  type PanelResolvedProps,
} from '@/components/Panel/types'

export type PanelDescriptor = NovaComponentDescriptor<PanelResolvedProps, PanelApi, Record<string, never>, PanelProps>

export type PanelNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<PanelProps>,
) => NovaComponentNode<PanelResolvedProps, PanelApi, Record<string, never>, PanelProps, E>

export const PANEL_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  title: { type: 'string' },
  subtitle: { type: 'string' },
  density: { type: 'string' },
  header: { type: 'schema' },
  footer: { type: 'schema' },
} as const

export function normalizePanelProps(props: PanelProps = {}): PanelResolvedProps {
  return {
    ...normalizeCommonProps(props, {
      width: 360,
      height: 260,
      background: '#ffffff',
      border: { color: '#cbd5e1', width: 1, radius: 10 },
      padding: 16,
      clip: true,
      color: '#172033',
    }),
    title: props.title ?? '',
    subtitle: props.subtitle ?? '',
    density: props.density ?? 'regular',
    header: props.header,
    footer: props.footer,
  }
}

export function createPanelDescriptor(createNode?: PanelNodeFactory): PanelDescriptor {
  const descriptor: PanelDescriptor = {
    type: PANEL_SCHEMA_TYPE,
    name: 'Panel',
    title: 'Panel',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'density', 'header', 'footer'],
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'title', 'subtitle'],
    },
    fields: PANEL_FIELD_DEFINITIONS,
    normalize: schema => normalizePanelProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizePanelProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const PANEL_NODE_DESCRIPTOR = createPanelDescriptor()
