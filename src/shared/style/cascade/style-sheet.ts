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
  | 'SpeedDial'
  | 'Dock'
  | 'Carousel'
  | 'Galleria'
  | 'ImagePreview'
  | 'ImageCompare'
  | 'Skeleton'
  | 'ProgressBar'
  | 'ProgressSpinner'
  | 'MeterGroup'
  | 'Knob'
  | 'ToggleSwitch'
  | 'RadioButton'
  | 'Rating'
  | 'SelectButton'
  | 'Dialog'
  | 'Drawer'
  | 'Popover'
  | 'Toast'
  | 'Message'
  | 'BlockUI'
  | 'Accordion'
  | 'Fieldset'
  | 'Tabs'
  | 'Stepper'
  | 'TimelineChart'
export type NovaUiStyleSelectorCombinator = 'descendant' | 'child'
export type NovaUiStyleDisplay = 'normal' | 'none'
export type NovaUiStyleResponsiveVariant = 'base' | 'sm' | 'md' | 'lg'
export type NovaUiStyleMediaFeatureName = 'min-width' | 'max-width' | 'min-height' | 'max-height'

export interface NovaUiStyleMediaFeature {
  name: NovaUiStyleMediaFeatureName
  value: number
}

export interface NovaUiStyleMediaQuery {
  features: Array<NovaUiStyleMediaFeature>
}

export interface NovaUiStyleMediaContext {
  width: number
  height: number
}

/** Один segment CSS-подобного selector. */
export interface NovaUiStyleSelectorPart {
  type?: NovaUiStyleComponentName
  id?: string
  classes: Array<string>
  attrs: Record<string, string | true>
  pseudos: Array<string>
}

/** Скомпилированный selector с specificity и связями между segment. */
export interface NovaUiStyleSelector {
  raw: string
  parts: Array<NovaUiStyleSelectorPart>
  combinators: Array<NovaUiStyleSelectorCombinator>
  specificity: number
}

/** Набор деклараций, который selector engine может применить к UI Kit node. */
export interface NovaUiStyleDeclarations {
  customProperties?: Record<string, string>
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
    display?: NovaUiStyleDisplay
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
  media?: NovaUiStyleMediaQuery
  rightMostId?: string
  rightMostClasses: Array<string>
  rightMostType?: NovaUiStyleComponentName
}

/** Готовый к hot path stylesheet с индексами по правой части selector. */
export interface NovaUiCompiledStyleSheet {
  rules: Array<NovaUiCompiledStyleRule>
  byId: Map<string, Array<NovaUiCompiledStyleRule>>
  byClass: Map<string, Array<NovaUiCompiledStyleRule>>
  byType: Map<NovaUiStyleComponentName, Array<NovaUiCompiledStyleRule>>
  universal: Array<NovaUiCompiledStyleRule>
  version: number
  source?: string
  tokenDependencies?: Array<string>
}

/** Theme block, extracted from `.novacss @theme`. */
export interface NovaUiStyleThemeDefinition {
  id: string
  tokens: Record<`--${string}`, string | number>
  styleSheet: NovaUiCompiledStyleSheet | null
}

/** Precompiled stylesheet asset для `.novacss` и `<style>` блоков `.nova`. */
export interface NovaUiStyleSheetAsset {
  ok: boolean
  source: string
  styleSheet: NovaUiCompiledStyleSheet | null
  themes?: Array<NovaUiStyleThemeDefinition>
  diagnostics: Array<NovaUiStyleDiagnostic>
  tokenDependencies: Array<string>
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
  diagnostics: Array<NovaUiStyleDiagnostic>
}

/** Debug-снимок matched rule для Nova DevTools. */
export interface NovaUiStyleMatchedRuleDebug {
  selector: string
  specificity: number
  order: number
  declarations: NovaUiStyleDeclarations
}

/** Debug-снимок cascade state для выбранной UI Kit node. */
export interface NovaUiStyleInspectionDebug {
  rootComponentId: string
  nodeComponentId: string
  nodeType: string
  styleSheetSource: string
  matchedRules: Array<NovaUiStyleMatchedRuleDebug>
  mergedDeclarations: NovaUiStyleDeclarations
  baselineProps: Record<string, unknown>
  currentProps: Record<string, unknown>
  appliedKeys: Array<string>
  diagnostics: Array<NovaUiStyleDiagnostic>
}

/** Минимальный контракт node, которую cascade engine может стилизовать. */
export type NovaUiStylableNode = NovaComponentNode<any, any, any, any> & {
  componentId: string
}
