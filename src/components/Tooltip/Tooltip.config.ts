import type {
  NovaComponentCreateContext,
  NovaComponentDescriptor,
  NovaComponentNode,
  NovaComponentSchema,
  NovaSchema,
  NovaSchemaItem,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  finiteNumber,
  normalizeCommonProps,
} from '@/shared/component'
import { resolveSpacing } from '@/shared/layout'
import { borderRadiusToRendererValue } from '@/shared/style'
import {
  TOOLTIP_SCHEMA_TYPE,
  type TooltipContent,
  type TooltipApi,
  type TooltipProps,
  type TooltipResolvedProps,
} from '@/components/Tooltip/tooltip.types'

export type TooltipDescriptor = NovaComponentDescriptor<TooltipResolvedProps, TooltipApi, Record<string, never>, TooltipProps>

export type TooltipNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<TooltipProps>,
) => NovaComponentNode<TooltipResolvedProps, TooltipApi, Record<string, never>, TooltipProps, E>

export const TOOLTIP_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  content: { type: 'record' },
  placement: { type: 'string' },
  delay: { type: 'number' },
  hideDelay: { type: 'number' },
  open: { type: 'boolean' },
  trigger: { type: 'record' },
  followCursor: { type: 'boolean' },
  collision: { type: 'record' },
  animation: { type: 'record' },
  contentClassName: { type: 'string' },
  arrowClassName: { type: 'string' },
  onOpenChange: { type: 'function' },
  onShow: { type: 'function' },
  onHide: { type: 'function' },
} as const

const DEFAULT_COLLISION = {
  boundary: 'canvas' as const,
  padding: 8,
  flip: true,
  shift: true,
}

const DEFAULT_ANIMATION = {
  type: 'fade-scale' as const,
  duration: 120,
  easing: 'outCubic',
}

export function normalizeTooltipProps(props: TooltipProps = {}): TooltipResolvedProps {
  const className = mergeClassNames('nova-tooltip', props.className)

  return {
    ...normalizeCommonProps(props, {
      width: 120,
      height: 32,
      background: '#111827',
      color: '#ffffff',
      border: { color: 'rgba(255,255,255,0.12)', width: 1, radius: 7 },
      padding: { horizontal: 10, vertical: 7 },
      className,
    }),
    className,
    attrs: {
      ...(props.attrs ?? {}),
      open: props.open ?? false,
      placement: props.placement ?? 'top',
      contentType: resolveTooltipContentType(props.content),
    },
    content: normalizeTooltipContent(props.content),
    placement: props.placement ?? 'top',
    open: props.open ?? false,
    delay: Math.max(0, finiteNumber(props.delay, 300)),
    hideDelay: Math.max(0, finiteNumber(props.hideDelay, 80)),
    trigger: props.trigger ?? 'hover',
    followCursor: props.followCursor ?? false,
    collision: {
      boundary: props.collision?.boundary ?? DEFAULT_COLLISION.boundary,
      padding: Math.max(0, finiteNumber(props.collision?.padding, DEFAULT_COLLISION.padding)),
      flip: props.collision?.flip ?? DEFAULT_COLLISION.flip,
      shift: props.collision?.shift ?? DEFAULT_COLLISION.shift,
    },
    animation: props.animation === false
      ? false
      : {
          type: props.animation?.type ?? DEFAULT_ANIMATION.type,
          duration: Math.max(0, finiteNumber(props.animation?.duration, DEFAULT_ANIMATION.duration)),
          easing: props.animation?.easing ?? DEFAULT_ANIMATION.easing,
        },
    contentClassName: props.contentClassName ?? 'nova-tooltip__content',
    arrowClassName: props.arrowClassName ?? 'nova-tooltip__arrow',
    onOpenChange: props.onOpenChange,
    onShow: props.onShow,
    onHide: props.onHide,
  }
}

export function createTooltipDescriptor(createNode?: TooltipNodeFactory): TooltipDescriptor {
  const descriptor: TooltipDescriptor = {
    type: TOOLTIP_SCHEMA_TYPE,
    name: 'Tooltip',
    title: 'Tooltip',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'content', 'placement', 'followCursor'],
      render: [
        ...NOVA_UI_COMMON_DIRTY_POLICY.render,
        'delay',
        'hideDelay',
        'open',
        'trigger',
        'collision',
        'animation',
        'contentClassName',
        'arrowClassName',
        'onOpenChange',
        'onShow',
        'onHide',
      ],
    },
    fields: TOOLTIP_FIELD_DEFINITIONS,
    normalize: schema => normalizeTooltipProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeTooltipProps),
  }
  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const TOOLTIP_NODE_DESCRIPTOR = createTooltipDescriptor()

export function createTooltipSchema(props: TooltipProps): NovaSchema {
  const resolved = normalizeTooltipProps(props)
  if (!resolved.open || !resolved.content) return []

  const padding = resolveSpacing(resolved.padding)
  const measuredContentSchema = createTooltipContentSchema(resolved)
  const contentBounds = measureTooltipContent(measuredContentSchema, resolved)
  const width = Math.max(
    resolved.width,
    props.width ?? 0,
    contentBounds.width + padding.left + padding.right,
  )
  const height = Math.max(
    resolved.height,
    props.height ?? 0,
    contentBounds.height + padding.top + padding.bottom,
  )
  const finalResolved: TooltipResolvedProps = {
    ...resolved,
    width,
    height,
  }
  const contentSchema = createTooltipContentSchema(finalResolved)
  const rect = resolveTooltipRect(finalResolved, width, height)
  const schema: NovaSchema = []

  schema.push({
    type: 'rect',
    x: rect.x,
    y: rect.y,
    width,
    height,
    styles: {
      background: resolved.background,
      opacity: resolved.opacity,
      border: resolved.border?.width
        ? {
            color: resolved.border.color ?? 'rgba(255,255,255,0.12)',
            width: resolved.border.width,
            radius: borderRadiusToRendererValue(resolved.border.radius),
          }
        : undefined,
    },
    meta: {
      className: resolved.className,
      attrs: resolved.attrs,
    },
  })

  appendTooltipContent(schema, contentSchema, rect.x + padding.left, rect.y + padding.top)

  return schema
}

function normalizeTooltipContent(content: TooltipContent | null | undefined): TooltipContent | null {
  if (typeof content === 'string') return content ? content : null
  if (!content) return null
  if ('text' in content && !content.text) return null
  if ('markdown' in content && !content.markdown) return null

  return content
}

function resolveTooltipContentType(content: TooltipContent | null | undefined): string {
  if (typeof content === 'string') return content ? 'text' : 'empty'
  if (!content) return 'empty'
  if ('markdown' in content) return 'markdown'
  if ('schema' in content) return 'schema'
  return 'text'
}

function mergeClassNames(base: string, value?: string | Array<string>): string | Array<string> {
  if (!value) return base
  if (Array.isArray(value)) return [base, ...value.filter(Boolean)]

  return value.includes(base) ? value : `${base} ${value}`
}

function createTooltipContentSchema(props: TooltipResolvedProps): NovaSchema {
  const content = props.content
  if (!content) return []

  const padding = resolveSpacing(props.padding)
  const width = Math.max(1, props.width - padding.left - padding.right)
  const height = Math.max(1, props.height - padding.top - padding.bottom)
  const fontFamily = props.fontFamily ?? 'Inter, Arial, sans-serif'
  const fontSize = props.fontSize ?? 13
  const fontWeight = props.fontWeight ?? '500'
  const fontStyle = props.fontStyle ?? 'normal'
  const lineHeight = props.lineHeight ?? 18

  if (typeof content === 'string' || 'text' in content || 'markdown' in content) {
    const text = typeof content === 'string'
      ? content
      : 'text' in content
        ? content.text
        : content.markdown

    return [
      {
        type: 'text',
        parser: typeof content !== 'string' && 'markdown' in content ? 'markdown' : 'string',
        x: 0,
        y: 0,
        width,
        height,
        text,
        styles: {
          color: props.color ?? '#ffffff',
          font: {
            family: fontFamily,
            size: fontSize,
            weight: fontWeight,
            style: fontStyle,
          },
          lineHeight,
          align: {
            horizontal: 'left',
            vertical: 'top',
            overflow: 'start',
          },
          ellipsis: false,
        },
        meta: {
          className: props.contentClassName,
          textRole: 'ui-label',
          textMode: 'run-atlas',
        },
      },
    ]
  }

  const schema = typeof content.schema === 'function' ? content.schema() : content.schema

  return schema.slice() as NovaSchema
}

function measureTooltipContent(schema: NovaSchema, props: TooltipResolvedProps): { width: number; height: number } {
  let width = 0
  let height = 0

  for (const item of schema) {
    if (item.type === 'text') {
      const lines = item.text.split('\n')
      const lineHeight = item.styles?.lineHeight ?? props.lineHeight ?? props.fontSize ?? 13
      const fontSize = item.styles?.font?.size ?? props.fontSize ?? 13
      const maxChars = lines.reduce((max, line) => Math.max(max, line.replace(/\*\*/g, '').length), 0)
      width = Math.max(width, Math.ceil(maxChars * fontSize * 0.62))
      height = Math.max(height, Math.ceil(lines.length * lineHeight))
      continue
    }

    const shape = item as Record<string, any>
    width = Math.max(width, (shape.x ?? 0) + (shape.width ?? 0))
    height = Math.max(height, (shape.y ?? 0) + (shape.height ?? 0))
  }

  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  }
}

function resolveTooltipRect(
  props: TooltipResolvedProps,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  const gap = 8
  let x = props.x
  let y = props.y

  if (props.placement === 'top') {
    x = props.x + (props.width - width) / 2
    y = props.y - height - gap
  } else if (props.placement === 'bottom') {
    x = props.x + (props.width - width) / 2
    y = props.y + props.height + gap
  } else if (props.placement === 'left') {
    x = props.x - width - gap
    y = props.y + (props.height - height) / 2
  } else if (props.placement === 'right') {
    x = props.x + props.width + gap
    y = props.y + (props.height - height) / 2
  } else {
    x = props.x + gap
    y = props.y + gap
  }

  return {
    x,
    y,
    width,
    height,
  }
}

function appendTooltipContent(target: NovaSchema, source: NovaSchema, x: number, y: number): void {
  for (const sourceItem of source) {
    const item = { ...sourceItem } as NovaSchemaItem & Record<string, any>
    item.x = (item.x ?? 0) + x
    item.y = (item.y ?? 0) + y
    target.push(item)
  }
}
