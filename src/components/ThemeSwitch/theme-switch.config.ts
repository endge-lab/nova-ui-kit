import type {
  NovaComponentCreateContext,
  NovaComponentDescriptor,
  NovaComponentNode,
  NovaComponentSchema,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  THEME_SWITCH_SCHEMA_TYPE,
  type ThemeSwitchApi,
  type ThemeSwitchProps,
  type ThemeSwitchResolvedProps,
} from '@/components/ThemeSwitch/theme-switch.types'
import { normalizeThemeSwitchThemes } from '@/components/ThemeSwitch/theme-switch-assets'
import { resolveNovaUiPosition } from '@/shared/layout'

export type ThemeSwitchDescriptor = NovaComponentDescriptor<
  ThemeSwitchResolvedProps,
  ThemeSwitchApi,
  Record<string, never>,
  ThemeSwitchProps
>

export type ThemeSwitchNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<ThemeSwitchProps>,
) => NovaComponentNode<ThemeSwitchResolvedProps, ThemeSwitchApi, Record<string, never>, ThemeSwitchProps, E>

export const THEME_SWITCH_FIELD_DEFINITIONS = {
  x: { type: 'number' },
  y: { type: 'number' },
  width: { type: 'number' },
  height: { type: 'number' },
  position: { type: 'string' },
  inset: { type: 'spacing' },
  zIndex: { type: 'number' },
  placement: { type: 'string' },
  margin: { type: 'number' },
  themes: { type: 'array' },
  mode: { type: 'string' },
  value: { type: 'string' },
  visible: { type: 'boolean' },
  onChange: { type: 'function' },
} as const

export function normalizeThemeSwitchProps(props: ThemeSwitchProps = {}): ThemeSwitchResolvedProps {
  return {
    x: props.x,
    y: props.y,
    width: finiteNumber(props.width, props.mode === 'segmented' ? 88 : 36),
    height: finiteNumber(props.height, 36),
    position: resolveNovaUiPosition(props.position),
    inset: props.inset,
    zIndex: finiteOptionalNumber(props.zIndex, 2001),
    placement: props.placement,
    margin: finiteNumber(props.margin, 12),
    themes: normalizeThemeSwitchThemes(props.themes),
    mode: props.mode ?? 'cycle',
    value: props.value,
    visible: props.visible ?? true,
    onChange: props.onChange,
  }
}

export function createThemeSwitchDescriptor(createNode?: ThemeSwitchNodeFactory): ThemeSwitchDescriptor {
  const descriptor: ThemeSwitchDescriptor = {
    type: THEME_SWITCH_SCHEMA_TYPE,
    name: 'ThemeSwitch',
    title: 'Theme Switch',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: ['x', 'y', 'placement', 'margin', 'zIndex'],
      update: ['width', 'height', 'position', 'inset', 'mode', 'visible'],
      render: ['themes', 'value'],
    },
    fields: THEME_SWITCH_FIELD_DEFINITIONS,
    normalize: schema => normalizeThemeSwitchProps(schema.props),
    measureBounds: (_context, schema) => {
      const props = normalizeThemeSwitchProps(schema.props)
      return { x: props.x ?? 0, y: props.y ?? 0, width: props.width, height: props.height }
    },
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const THEME_SWITCH_NODE_DESCRIPTOR = createThemeSwitchDescriptor()

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function finiteOptionalNumber(value: unknown, fallback?: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
