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
  commonMeasureBounds,
  normalizeCommonProps,
  sizeTokenHeight,
} from '@/shared/component'
import {
  BUTTON_SCHEMA_TYPE,
  type ButtonApi,
  type ButtonProps,
  type ButtonResolvedProps,
} from '@/components/Button/Button.types'

export type ButtonDescriptor = NovaComponentDescriptor<
  ButtonResolvedProps,
  ButtonApi,
  Record<string, never>,
  ButtonProps
>

export type ButtonNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<ButtonProps>,
) => NovaComponentNode<ButtonResolvedProps, ButtonApi, Record<string, never>, ButtonProps, E>

export const BUTTON_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  text: { type: 'string' },
  icon: { type: 'icon' },
  iconPlacement: { type: 'string' },
  variant: { type: 'string' },
  size: { type: 'string' },
  loading: { type: 'boolean' },
  selected: { type: 'boolean' },
  onPress: { type: 'function' },
} as const

export function normalizeButtonProps(props: ButtonProps = {}): ButtonResolvedProps {
  const variant = props.variant ?? 'default'
  const size = props.size ?? 'md'
  const defaults = resolveButtonDefaults(variant, size)
  const common = normalizeCommonProps(props, defaults)

  return {
    ...common,
    text: props.text ?? '',
    icon: props.icon,
    iconPlacement: props.iconPlacement ?? (props.icon && !props.text ? 'only' : 'left'),
    variant,
    size,
    loading: props.loading ?? false,
    selected: props.selected ?? false,
    onPress: props.onPress,
  }
}

export function createButtonDescriptor(createNode?: ButtonNodeFactory): ButtonDescriptor {
  const descriptor: ButtonDescriptor = {
    type: BUTTON_SCHEMA_TYPE,
    name: 'Button',
    title: 'Button',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'text', 'icon', 'iconPlacement', 'size'],
      render: [
        ...NOVA_UI_COMMON_DIRTY_POLICY.render,
        'variant',
        'loading',
        'selected',
        'onPress',
      ],
    },
    fields: BUTTON_FIELD_DEFINITIONS,
    normalize: schema => normalizeButtonProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeButtonProps),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const BUTTON_NODE_DESCRIPTOR = createButtonDescriptor()

function resolveButtonDefaults(variant: ButtonResolvedProps['variant'], size: ButtonResolvedProps['size']) {
  const baseHeight = sizeTokenHeight(size, 32)
  if (variant === 'primary') {
    return {
      width: 128,
      height: baseHeight,
      background: '#2563eb',
      color: '#ffffff',
      border: { color: '#1d4ed8', width: 1, radius: 7 },
      hoverBackground: '#1d4ed8',
      pressedBackground: '#1e40af',
      activeBackground: '#1d4ed8',
      cursor: { hover: 'pointer', pressed: 'pointer', disabled: 'not-allowed' },
    }
  }
  if (variant === 'danger') {
    return {
      width: 128,
      height: baseHeight,
      background: '#dc2626',
      color: '#ffffff',
      border: { color: '#b91c1c', width: 1, radius: 7 },
      hoverBackground: '#b91c1c',
      pressedBackground: '#991b1b',
      cursor: { hover: 'pointer', pressed: 'pointer', disabled: 'not-allowed' },
    }
  }
  if (variant === 'ghost') {
    return {
      width: 112,
      height: baseHeight,
      background: 'rgba(255,255,255,0)',
      color: '#334155',
      border: { color: 'rgba(148,163,184,0)', width: 1, radius: 7 },
      hoverBackground: 'rgba(148,163,184,0.14)',
      pressedBackground: 'rgba(148,163,184,0.24)',
      activeBackground: 'rgba(37,99,235,0.14)',
      cursor: { hover: 'pointer', pressed: 'pointer', disabled: 'not-allowed' },
    }
  }

  return {
    width: 128,
    height: baseHeight,
    background: '#ffffff',
    color: '#172033',
    border: { color: '#cbd5e1', width: 1, radius: 7 },
    hoverBackground: '#f8fafc',
    pressedBackground: '#eef2f7',
    activeBackground: '#eff6ff',
    cursor: { hover: 'pointer', pressed: 'pointer', disabled: 'not-allowed' },
  }
}
