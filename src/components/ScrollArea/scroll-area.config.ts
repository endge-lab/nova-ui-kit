import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
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
  SCROLL_AREA_SCHEMA_TYPE,
  type ScrollAreaApi,
  type ScrollAreaProps,
  type ScrollAreaResolvedProps,
} from '@/components/ScrollArea/scroll-area.types'

export type ScrollAreaDescriptor = NovaComponentDescriptor<ScrollAreaResolvedProps, ScrollAreaApi, Record<string, never>, ScrollAreaProps>

export type ScrollAreaNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<ScrollAreaProps>,
) => NovaComponentNode<ScrollAreaResolvedProps, ScrollAreaApi, Record<string, never>, ScrollAreaProps, E>

export const SCROLL_AREA_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  scrollX: { type: 'number' },
  scrollY: { type: 'number' },
  contentWidth: { type: 'number' },
  contentHeight: { type: 'number' },
  scrollbarVisibility: { type: 'string' },
  scrollbarIdleDelay: { type: 'number' },
  scrollbarFadeDuration: { type: 'number' },
  axis: { type: 'string' },
  wheelMultiplier: { type: 'number' },
  scrollbar: { type: 'record' },
  onScroll: { type: 'function' },
  onScrollStart: { type: 'function' },
  onScrollEnd: { type: 'function' },
  onThumbClick: { type: 'function' },
  onTrackClick: { type: 'function' },
  onScrollbarClick: { type: 'function' },
} as const

export function normalizeScrollAreaProps(props: ScrollAreaProps = {}): ScrollAreaResolvedProps {
  const width = Math.max(1, finiteNumber(props.width, 320))
  const height = Math.max(1, finiteNumber(props.height, 220))
  const contentWidth = Math.max(width, finiteNumber(props.contentWidth, width))
  const contentHeight = Math.max(height, finiteNumber(props.contentHeight, height))

  return {
    ...normalizeCommonProps(props, {
      width,
      height,
      background: '#ffffff',
      border: { color: '#d6d9e2', width: 1, radius: 8 },
      clip: true,
      trackColor: 'rgba(148,163,184,0.22)',
      thumbColor: 'rgba(71,85,105,0.7)',
    }),
    scrollX: clamp(finiteNumber(props.scrollX, 0), 0, Math.max(0, contentWidth - width)),
    scrollY: clamp(finiteNumber(props.scrollY, 0), 0, Math.max(0, contentHeight - height)),
    contentWidth,
    contentHeight,
    scrollbarVisibility: props.scrollbarVisibility ?? 'auto',
    scrollbarIdleDelay: Math.max(0, finiteNumber(props.scrollbarIdleDelay, 900)),
    scrollbarFadeDuration: Math.max(0, finiteNumber(props.scrollbarFadeDuration, 160)),
    axis: props.axis ?? 'both',
    wheelMultiplier: Math.max(0, finiteNumber(props.wheelMultiplier, 1)),
    scrollbar: props.scrollbar ?? {},
    onScroll: props.onScroll,
    onScrollStart: props.onScrollStart,
    onScrollEnd: props.onScrollEnd,
    onThumbClick: props.onThumbClick,
    onTrackClick: props.onTrackClick,
    onScrollbarClick: props.onScrollbarClick,
  }
}

export function createScrollAreaDescriptor(createNode?: ScrollAreaNodeFactory): ScrollAreaDescriptor {
  const descriptor: ScrollAreaDescriptor = {
    type: SCROLL_AREA_SCHEMA_TYPE,
    name: 'ScrollArea',
    title: 'Scroll area',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'contentWidth', 'contentHeight', 'scrollbarVisibility', 'scrollbar', 'axis'],
      render: [
        ...NOVA_UI_COMMON_DIRTY_POLICY.render,
        'scrollX',
        'scrollY',
        'scrollbarIdleDelay',
        'scrollbarFadeDuration',
        'wheelMultiplier',
        'onScroll',
        'onScrollStart',
        'onScrollEnd',
        'onThumbClick',
        'onTrackClick',
        'onScrollbarClick',
      ],
    },
    fields: SCROLL_AREA_FIELD_DEFINITIONS,
    normalize: schema => normalizeScrollAreaProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeScrollAreaProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const SCROLL_AREA_NODE_DESCRIPTOR = createScrollAreaDescriptor()
