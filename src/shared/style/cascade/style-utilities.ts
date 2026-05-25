import type { NovaUiLayoutIntent, NovaUiLayoutValue, NovaUiSpacing } from '@/shared/layout'
import { NovaUiStyleMask } from '@/shared/style/style-context'
import type { NovaUiStyleDeclarations } from '@/shared/style/cascade/style-sheet'

const utilityCache = new Map<string, NovaUiStyleDeclarations>()

/** Резолвит Nova utility classes в те же declarations, что и NovaCSS. */
export function resolveNovaUiClassUtilities(className: unknown): NovaUiStyleDeclarations {
  const source = normalizeClassName(className)
  if (!source) return { mask: NovaUiStyleMask.None }

  const cached = utilityCache.get(source)
  if (cached) return cached

  const declarations: NovaUiStyleDeclarations = { mask: NovaUiStyleMask.None }
  for (const token of source.split(/\s+/)) {
    applyUtilityToken(declarations, token)
  }

  utilityCache.set(source, declarations)
  return declarations
}

/** Резолвит только layout-часть utility classes. */
export function resolveNovaUiClassLayoutIntent(className: unknown): NovaUiLayoutIntent | undefined {
  return resolveNovaUiClassUtilities(className).layout
}

function normalizeClassName(className: unknown): string {
  if (typeof className === 'string') return className.trim()
  if (Array.isArray(className)) return className.map(normalizeClassName).filter(Boolean).join(' ')
  if (!className || typeof className !== 'object') return ''

  return Object
    .entries(className as Record<string, unknown>)
    .filter(([, active]) => !!active)
    .map(([name]) => name)
    .join(' ')
}

function applyUtilityToken(target: NovaUiStyleDeclarations, rawToken: string): void {
  const token = rawToken.includes(':') ? rawToken.slice(rawToken.lastIndexOf(':') + 1) : rawToken
  if (!token) return

  if (token === 'grow') return setLayout(target, { flexGrow: 1 })
  if (token === 'grow-0') return setLayout(target, { flexGrow: 0 })
  if (token === 'shrink') return setLayout(target, { flexShrink: 1 })
  if (token === 'shrink-0') return setLayout(target, { flexShrink: 0 })
  if (token === 'flex-1') return setLayout(target, { flexGrow: 1, flexShrink: 1, flexBasis: 0 })
  if (token === 'basis-auto') return setLayout(target, { flexBasis: 'auto' })
  if (token === 'w-full') return setLayout(target, { width: 'fill' })
  if (token === 'h-full') return setLayout(target, { height: 'fill' })
  if (token === 'min-w-0') return setLayout(target, { minWidth: 0 })
  if (token === 'min-h-0') return setLayout(target, { minHeight: 0 })
  if (token === 'overflow-hidden') {
    target.box = { ...target.box, clip: true }
    return
  }

  const arbitraryWidth = parseArbitraryLayoutValue(token, 'w')
  if (arbitraryWidth !== undefined) return setLayout(target, { width: arbitraryWidth })

  const arbitraryHeight = parseArbitraryLayoutValue(token, 'h')
  if (arbitraryHeight !== undefined) return setLayout(target, { height: arbitraryHeight })

  const arbitraryBasis = parseArbitraryLayoutValue(token, 'basis')
  if (arbitraryBasis !== undefined) return setLayout(target, { flexBasis: arbitraryBasis })

  const numericWidth = parseNumericUtility(token, 'w')
  if (numericWidth !== undefined) return setLayout(target, { width: numericWidth })

  const numericHeight = parseNumericUtility(token, 'h')
  if (numericHeight !== undefined) return setLayout(target, { height: numericHeight })

  const numericMinWidth = parseNumericUtility(token, 'min-w')
  if (numericMinWidth !== undefined) return setLayout(target, { minWidth: numericMinWidth })

  const numericMinHeight = parseNumericUtility(token, 'min-h')
  if (numericMinHeight !== undefined) return setLayout(target, { minHeight: numericMinHeight })

  const numericGap = parseNumericUtility(token, 'gap')
  if (numericGap !== undefined) return setLayout(target, { gap: numericGap })

  const numericGapX = parseNumericUtility(token, 'gap-x')
  if (numericGapX !== undefined) return setLayout(target, { columnGap: numericGapX })

  const numericGapY = parseNumericUtility(token, 'gap-y')
  if (numericGapY !== undefined) return setLayout(target, { rowGap: numericGapY })

  const padding = parseSpacingUtility(token, 'p')
  if (padding !== undefined) {
    target.spacing = { ...target.spacing, padding }
    return
  }

  const margin = parseSpacingUtility(token, 'm')
  if (margin !== undefined) {
    target.spacing = { ...target.spacing, margin }
    setLayout(target, { margin })
  }
}

function setLayout(target: NovaUiStyleDeclarations, layout: NovaUiLayoutIntent): void {
  target.layout = {
    ...target.layout,
    ...layout,
  }
}

function parseNumericUtility(token: string, prefix: string): number | undefined {
  const source = readUtilityValue(token, prefix)
  if (source === null || source.includes('[')) return undefined
  const value = Number(source)
  return Number.isFinite(value) ? value : undefined
}

function parseArbitraryLayoutValue(token: string, prefix: string): NovaUiLayoutValue | undefined {
  const source = readUtilityValue(token, prefix)
  if (!source?.startsWith('[') || !source.endsWith(']')) return undefined

  const value = source.slice(1, -1).trim()
  if (!value) return undefined
  if (value === 'full' || value === 'fill') return 'fill'
  if (value.endsWith('px')) {
    const px = Number(value.slice(0, -2))
    return Number.isFinite(px) ? px : undefined
  }
  if (value.endsWith('%')) return value as `${number}%`

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function parseSpacingUtility(token: string, prefix: 'p' | 'm'): NovaUiSpacing | undefined {
  const axis = token.startsWith(`${prefix}x-`)
    ? 'x'
    : token.startsWith(`${prefix}y-`)
      ? 'y'
      : ''
  const key = axis ? `${prefix}${axis}` : prefix
  const value = parseNumericUtility(token, key)
  if (value === undefined) return undefined

  if (axis === 'x') return { horizontal: value }
  if (axis === 'y') return { vertical: value }
  return value
}

function readUtilityValue(token: string, prefix: string): string | null {
  const marker = `${prefix}-`
  return token.startsWith(marker) ? token.slice(marker.length) : null
}
