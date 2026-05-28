import {
  compileStyleSheetIndexes,
} from '@/shared/style/cascade/style-selector-matcher'
import type {
  NovaUiCompiledStyleRule,
  NovaUiCompiledStyleSheet,
  NovaUiStyleDeclarations,
  NovaUiStyleSheetAsset,
  NovaUiStyleTokenResolver,
} from '@/shared/style/cascade/style-sheet'

const VAR_PATTERN = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g
const NUMERIC_TOKEN_KEYS = new Set([
  'fontSize',
  'lineHeight',
  'opacity',
  'borderWidth',
  'borderRadius',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'order',
  'gap',
  'rowGap',
  'columnGap',
  'disabledOpacity',
])

/** Проверяет precompiled stylesheet asset. */
export function isNovaUiStyleSheetAsset(value: unknown): value is NovaUiStyleSheetAsset {
  return !!value
    && typeof value === 'object'
    && 'source' in value
    && 'diagnostics' in value
    && 'styleSheet' in value
}

/** Создает resolver CSS custom properties от DOM element. */
export function createNovaUiCssVariableTokenResolver(element: Element): NovaUiStyleTokenResolver {
  let cacheVersion = 0
  let cache: CSSStyleDeclaration | null = null

  return {
    /**
     * Возвращает version для текущего класса.
     */
    get version() {
      return cacheVersion
    },
    /**
     * Нормализует и возвращает итоговое значение текущего класса.
     */
    resolve(name, fallback) {
      if (!cache) {
        cache = window.getComputedStyle(element)
        cacheVersion += 1
      }
      return cache.getPropertyValue(name).trim() || fallback
    },
  }
}

/** Извлекает token dependencies из source. */
export function extractNovaUiStyleTokenDependencies(source: string): Array<string> {
  const tokens = new Set<string>()
  for (const match of source.matchAll(VAR_PATTERN)) {
    tokens.add(match[1])
  }
  return [...tokens]
}

/** Возвращает stylesheet с resolved `var(--token, fallback)` values. */
export function resolveNovaUiStyleSheetTokens(
  sheet: NovaUiCompiledStyleSheet,
  resolver: NovaUiStyleTokenResolver | null,
): NovaUiCompiledStyleSheet {
  const tokenDependencies = sheet.tokenDependencies ?? extractNovaUiStyleTokenDependencies(sheet.source ?? '')
  if (!resolver || tokenDependencies.length === 0) return sheet

  const rules = sheet.rules.map<NovaUiCompiledStyleRule>(rule => ({
    ...rule,
    declarations: resolveDeclarations(rule.declarations, resolver),
    rightMostClasses: [...rule.rightMostClasses],
  }))
  const resolved = compileStyleSheetIndexes(rules, sheet.source, sheet.keyframes)
  resolved.tokenDependencies = tokenDependencies
  return resolved
}

function resolveDeclarations(
  declarations: NovaUiStyleDeclarations,
  resolver: NovaUiStyleTokenResolver,
): NovaUiStyleDeclarations {
  return resolveObject(declarations, resolver) as NovaUiStyleDeclarations
}

function resolveObject(value: unknown, resolver: NovaUiStyleTokenResolver, key = ''): unknown {
  if (typeof value === 'string') {
    const resolved = resolveStringTokens(value, resolver)
    if (NUMERIC_TOKEN_KEYS.has(key)) {
      const parsed = Number(resolved.replace(/px$/, ''))
      return Number.isFinite(parsed) ? parsed : resolved
    }
    return resolved
  }
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(item => resolveObject(item, resolver, key))

  const result: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    result[key] = resolveObject(child, resolver, key)
  }
  return result
}

function resolveStringTokens(value: string, resolver: NovaUiStyleTokenResolver): string {
  return value.replace(VAR_PATTERN, (_raw, name: string, fallback: string | undefined) => (
    resolver.resolve(name, fallback?.trim()) ?? fallback?.trim() ?? ''
  ))
}
