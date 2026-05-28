import type { NovaNode } from '@endge/nova'
import {
  compileLayoutValue,
  isAutoLayoutValue,
  resolveLayoutValue,
  type NovaUiLayoutRect,
  type NovaUiLayoutValue,
} from '@/shared/layout'
import { readNovaUiNodeProps } from '@/shared/layout/layout-intent'

export type NovaUiPosition = 'static' | 'relative' | 'absolute' | 'fixed'

export interface NovaUiInsetEdges {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

export type NovaUiInset = number | NovaUiInsetEdges

export interface NovaUiPositionedLayout {
  position?: NovaUiPosition
  inset?: NovaUiInset
  zIndex?: number
  width?: NovaUiLayoutValue
  height?: NovaUiLayoutValue
}

interface ResolvedInset {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

/** Нормализует CSS-like position. */
export function resolveNovaUiPosition(value: unknown): NovaUiPosition {
  return value === 'relative' || value === 'absolute' || value === 'fixed' ? value : 'static'
}

/** Проверяет, исключается ли node из flow-layout. */
export function isNovaUiOutOfFlowPosition(position: unknown): boolean {
  const resolved = resolveNovaUiPosition(position)
  return resolved === 'absolute' || resolved === 'fixed'
}

/** Собирает positioning layout из props node и явного child.layout. */
export function resolveNovaUiPositionedLayout(
  node: unknown,
  layout: NovaUiPositionedLayout = {},
): NovaUiPositionedLayout {
  const props = readNovaUiNodeProps(node)
  const result: NovaUiPositionedLayout = {}
  if (layout.position !== undefined || props.position !== undefined) {
    result.position = resolveNovaUiPosition(layout.position ?? props.position)
  }
  if (layout.inset !== undefined || props.inset !== undefined) {
    result.inset = layout.inset ?? props.inset as NovaUiInset | undefined
  }
  const zIndex = finiteOptionalNumber(layout.zIndex ?? props.zIndex)
  if (zIndex !== undefined) result.zIndex = zIndex
  if (layout.width !== undefined) result.width = layout.width
  if (layout.height !== undefined) result.height = layout.height
  return result
}

/** Вычисляет rect для static/relative/absolute child внутри container rect. */
export function resolveNovaUiPositionedRect(
  container: NovaUiLayoutRect,
  fallback: NovaUiLayoutRect,
  layout: NovaUiPositionedLayout,
  node?: NovaNode<any>,
): NovaUiLayoutRect {
  const position = resolveNovaUiPosition(layout.position)
  if (position === 'static') return { ...fallback }

  const inset = resolveInset(layout.inset)
  if (position === 'relative') {
    return {
      ...fallback,
      x: fallback.x + (inset.left ?? 0) - (inset.right ?? 0),
      y: fallback.y + (inset.top ?? 0) - (inset.bottom ?? 0),
    }
  }

  const fallbackWidth = fallback.width || node?.width || 0
  const fallbackHeight = fallback.height || node?.height || 0
  const explicitWidth = resolveMaybeLayoutValue(layout.width, container.width, fallbackWidth)
  const explicitHeight = resolveMaybeLayoutValue(layout.height, container.height, fallbackHeight)
  const width = explicitWidth ?? (
    inset.left !== undefined && inset.right !== undefined
      ? Math.max(0, container.width - inset.left - inset.right)
      : fallbackWidth
  )
  const height = explicitHeight ?? (
    inset.top !== undefined && inset.bottom !== undefined
      ? Math.max(0, container.height - inset.top - inset.bottom)
      : fallbackHeight
  )

  return {
    x: inset.left !== undefined
      ? container.x + inset.left
      : inset.right !== undefined
        ? container.x + container.width - inset.right - width
        : fallback.x,
    y: inset.top !== undefined
      ? container.y + inset.top
      : inset.bottom !== undefined
        ? container.y + container.height - inset.bottom - height
        : fallback.y,
    width,
    height,
  }
}

/** Применяет z-index node без переписывания geometry. */
export function applyNovaUiLayoutZIndex(node: NovaNode<any>, zIndex: number | undefined): void {
  if (zIndex === undefined) return
  const props = readNovaUiNodeProps(node)
  if (props.zIndex !== zIndex && 'setProps' in node && typeof (node as { setProps?: unknown }).setProps === 'function') {
    ;(node as unknown as { setProps: (patch: { zIndex: number }) => void }).setProps({ zIndex })
  }
  if (node.weight === zIndex) return
  node.options({ zIndex })
}

function resolveInset(value: NovaUiInset | undefined): ResolvedInset {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { top: value, right: value, bottom: value, left: value }
  }
  if (!value || typeof value !== 'object') return {}
  return {
    top: finiteOptionalNumber(value.top),
    right: finiteOptionalNumber(value.right),
    bottom: finiteOptionalNumber(value.bottom),
    left: finiteOptionalNumber(value.left),
  }
}

function resolveMaybeLayoutValue(
  value: NovaUiLayoutValue | undefined,
  available: number,
  fallback: number,
): number | undefined {
  if (value === undefined || value === 'auto') return undefined
  const compiled = compileLayoutValue(value, 'auto')
  if (isAutoLayoutValue(compiled)) return undefined
  return Math.max(0, resolveLayoutValue(compiled, available, fallback))
}

function finiteOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
