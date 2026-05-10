import type { NovaComponentNode, NovaCursorDeclaration } from '@endge/nova'
import type { NovaUiSpacing } from '@/shared/layout'
import type {
  NovaUiBorder,
  NovaUiInheritedTextStyle,
  NovaUiStyleMask,
} from '@/shared/style'

export type NovaUiStyleComponentName =
  | 'Root'
  | 'Flex'
  | 'Grid'
  | 'TextBlock'
  | 'Surface'
  | 'Button'
  | 'Tag'
  | 'SplitPane'
  | 'ScrollArea'
  | 'Scrollbar'
  | 'Slider'
  | 'Checkbox'
  | 'Toggle'
  | 'Tooltip'
  | 'SegmentedControl'
  | 'Panel'
export type NovaUiStyleSelectorCombinator = 'descendant' | 'child'

/** Один segment CSS-подобного selector. */
export interface NovaUiStyleSelectorPart {
  type?: NovaUiStyleComponentName
  id?: string
  classes: string[]
  attrs: Record<string, string | true>
  pseudos: string[]
}

/** Скомпилированный selector с specificity и связями между segment. */
export interface NovaUiStyleSelector {
  raw: string
  parts: NovaUiStyleSelectorPart[]
  combinators: NovaUiStyleSelectorCombinator[]
  specificity: number
}

/** Набор деклараций, который selector engine может применить к UI Kit node. */
export interface NovaUiStyleDeclarations {
  inheritedText?: NovaUiInheritedTextStyle
  box?: {
    background?: string
    border?: NovaUiBorder
    clip?: boolean
    opacity?: number
  }
  spacing?: {
    padding?: NovaUiSpacing
  }
  layout?: {
    gap?: number
    rowGap?: number
    columnGap?: number
  }
  visual?: {
    accentColor?: string
    trackColor?: string
    thumbColor?: string
    hoverBackground?: string
    pressedBackground?: string
    activeBackground?: string
    disabledOpacity?: number
  }
  cursor?: NovaCursorDeclaration
  mask: NovaUiStyleMask
}

/** Скомпилированное правило stylesheet. */
export interface NovaUiCompiledStyleRule {
  selector: NovaUiStyleSelector
  declarations: NovaUiStyleDeclarations
  order: number
  rightMostId?: string
  rightMostClasses: string[]
  rightMostType?: NovaUiStyleComponentName
}

/** Готовый к hot path stylesheet с индексами по правой части selector. */
export interface NovaUiCompiledStyleSheet {
  rules: NovaUiCompiledStyleRule[]
  byId: Map<string, NovaUiCompiledStyleRule[]>
  byClass: Map<string, NovaUiCompiledStyleRule[]>
  byType: Map<NovaUiStyleComponentName, NovaUiCompiledStyleRule[]>
  universal: NovaUiCompiledStyleRule[]
  version: number
  source?: string
  tokenDependencies?: string[]
}

/** Precompiled stylesheet asset для `.novacss` и `<style>` блоков `.nova`. */
export interface NovaUiStyleSheetAsset {
  ok: boolean
  source: string
  styleSheet: NovaUiCompiledStyleSheet | null
  diagnostics: NovaUiStyleDiagnostic[]
  tokenDependencies: string[]
  scopeId?: string
}

/** Runtime resolver theme/CSS tokens вне render hot path. */
export interface NovaUiStyleTokenResolver {
  resolve: (name: string, fallback?: string) => string | undefined
  version?: number
}

/** Публичный API Root style engine. */
export interface NovaUiRootStyleApi {
  setStyleSheetSource: (source: string | NovaUiStyleSheetAsset) => void
  setStyleSheetAsset: (asset: NovaUiStyleSheetAsset) => void
  resetStyleSheet: () => void
  refreshStyleTokens: () => void
  setStyleTokenResolver: (resolver: NovaUiStyleTokenResolver | null) => void
  validateStyleSheet: (source: string) => NovaUiStyleValidationResult
}

/** Diagnostic валидатора stylesheet. */
export interface NovaUiStyleDiagnostic {
  severity: 'error' | 'warning'
  code: string
  message: string
  line?: number
  column?: number
}

/** Результат парсинга и validation stylesheet. */
export interface NovaUiStyleValidationResult {
  ok: boolean
  styleSheet: NovaUiCompiledStyleSheet | null
  diagnostics: NovaUiStyleDiagnostic[]
}

/** Минимальный контракт node, которую cascade engine может стилизовать. */
export type NovaUiStylableNode = NovaComponentNode<any, any, any, any> & {
  componentId: string
}
