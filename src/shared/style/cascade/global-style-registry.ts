import type { NovaApp } from '@endge/nova'
import { compileStyleSheetIndexes, createEmptyStyleSheet } from '@/shared/style/cascade/style-selector-matcher'
import type {
  NovaUiCompiledStyleRule,
  NovaUiCompiledStyleSheet,
  NovaUiStyleDiagnostic,
  NovaUiStyleSheetAsset,
  NovaUiStyleThemeDefinition,
} from '@/shared/style/cascade/style-sheet'

interface NovaUiGlobalStyleState {
  entries: Map<symbol, NovaUiStyleSheetAsset>
  listeners: Set<() => void>
  version: number
  cached: NovaUiStyleSheetAsset | null
}

const GLOBAL_STYLES = new WeakMap<NovaApp<any>, NovaUiGlobalStyleState>()

/** Регистрирует global Nova UI stylesheet на время жизни владельца. */
export function registerNovaUiGlobalStyleSheet(
  app: NovaApp<any>,
  asset: NovaUiStyleSheetAsset,
): () => void {
  const state = resolveGlobalStyleState(app)
  const id = Symbol('nova-ui-global-style')
  state.entries.set(id, asset)
  invalidateGlobalStyleState(state)

  return () => {
    if (!state.entries.delete(id)) return
    invalidateGlobalStyleState(state)
  }
}

/** Подписывает Root на изменения global styles конкретного NovaApp. */
export function subscribeNovaUiGlobalStyleSheets(app: NovaApp<any>, listener: () => void): () => void {
  const state = resolveGlobalStyleState(app)
  state.listeners.add(listener)
  return () => {
    state.listeners.delete(listener)
  }
}

/** Возвращает объединенный global stylesheet asset для NovaApp. */
export function getNovaUiGlobalStyleSheet(app: NovaApp<any>): NovaUiStyleSheetAsset {
  const state = resolveGlobalStyleState(app)
  if (state.cached) return state.cached

  const assets = [...state.entries.values()]
  const styleSheets = assets
    .map(asset => asset.styleSheet)
    .filter((sheet): sheet is NovaUiCompiledStyleSheet => !!sheet)
  const source = assets.map(asset => asset.source).filter(Boolean).join('\n')
  const diagnostics = assets.flatMap(asset => asset.diagnostics)
  const tokenDependencies = [...new Set(assets.flatMap(asset => asset.tokenDependencies))]
  const themes = mergeNovaUiStyleThemes(assets.flatMap(asset => asset.themes ?? []))
  const ok = assets.every(asset => asset.ok)

  state.cached = {
    ok,
    source,
    styleSheet: mergeNovaUiStyleSheets(styleSheets, source),
    themes,
    diagnostics,
    tokenDependencies,
  }

  return state.cached
}

/** Объединяет stylesheets с сохранением порядка cascade. */
export function mergeNovaUiStyleSheets(
  styleSheets: ReadonlyArray<NovaUiCompiledStyleSheet>,
  source = '',
): NovaUiCompiledStyleSheet {
  if (styleSheets.length === 0) return createEmptyStyleSheet(source)

  let order = 0
  const rules: Array<NovaUiCompiledStyleRule> = []
  const tokenDependencies = new Set<string>()

  for (const sheet of styleSheets) {
    for (const dependency of sheet.tokenDependencies ?? []) tokenDependencies.add(dependency)
    for (const rule of sheet.rules) {
      rules.push({
        ...rule,
        order: order++,
      })
    }
  }

  const merged = compileStyleSheetIndexes(rules, source)
  merged.tokenDependencies = [...tokenDependencies]
  return merged
}

/** Объединяет theme stylesheet layers с тем же порядком cascade, что и обычные assets. */
export function mergeNovaUiStyleThemes(
  themes: ReadonlyArray<NovaUiStyleThemeDefinition>,
): Array<NovaUiStyleThemeDefinition> {
  const grouped = new Map<string, Array<NovaUiStyleThemeDefinition>>()
  for (const theme of themes) {
    const list = grouped.get(theme.id)
    if (list) list.push(theme)
    else grouped.set(theme.id, [theme])
  }

  return [...grouped.entries()].map(([id, entries]) => {
    const styleSheets = entries
      .map(entry => entry.styleSheet)
      .filter((sheet): sheet is NovaUiCompiledStyleSheet => !!sheet)
    const source = entries
      .map(entry => entry.styleSheet?.source)
      .filter(Boolean)
      .join('\n')

    return {
      id,
      tokens: entries.reduce<NovaUiStyleThemeDefinition['tokens']>((target, entry) => ({
        ...target,
        ...entry.tokens,
      }), {}),
      styleSheet: styleSheets.length > 0 ? mergeNovaUiStyleSheets(styleSheets, source) : null,
    }
  })
}

/** Создает empty asset для мест, где нужен стабильный stylesheet object. */
export function createEmptyNovaUiStyleSheetAsset(source = ''): NovaUiStyleSheetAsset {
  return {
    ok: true,
    source,
    styleSheet: createEmptyStyleSheet(source),
    diagnostics: [] as Array<NovaUiStyleDiagnostic>,
    tokenDependencies: [],
  }
}

function resolveGlobalStyleState(app: NovaApp<any>): NovaUiGlobalStyleState {
  let state = GLOBAL_STYLES.get(app)
  if (!state) {
    state = {
      entries: new Map(),
      listeners: new Set(),
      version: 0,
      cached: null,
    }
    GLOBAL_STYLES.set(app, state)
  }
  return state
}

function invalidateGlobalStyleState(state: NovaUiGlobalStyleState): void {
  state.version += 1
  state.cached = null
  for (const listener of state.listeners) listener()
}
