import type { NovaApp } from '@endge/nova'
import { compileStyleSheetIndexes, createEmptyStyleSheet } from '@/shared/style/cascade/StyleSelectorMatcher'
import type {
  NovaUiCompiledStyleRule,
  NovaUiCompiledStyleSheet,
  NovaUiStyleDiagnostic,
  NovaUiStyleSheetAsset,
} from '@/shared/style/cascade/StyleSheet'

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
  const ok = assets.every(asset => asset.ok)

  state.cached = {
    ok,
    source,
    styleSheet: mergeNovaUiStyleSheets(styleSheets, source),
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
