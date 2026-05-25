import type { NovaComponentSchema, NovaCursorContext, NovaCursorDeclaration, NovaElementSchema } from '@endge/nova'
import type {
  NovaUiLayoutRect,
  NovaUiSpacing,
} from '@/shared/layout'
import type {
  NovaUiBorder,
  NovaUiInheritedTextStyle,
  NovaUiStyleDiagnostic,
  NovaUiStyleDisplay,
  NovaUiStyleInspectionDebug,
  NovaUiCompiledStyleSheet,
  NovaUiStyleMediaContext,
  NovaUiStyleSheetAsset,
  NovaUiStyleTokenResolver,
  NovaUiStyleIdentityProps,
  NovaUiStyleValidationResult,
  NovaUiStylableNode,
} from '@/shared/style'
import type { TooltipDefinition } from '@/components/Tooltip/tooltip.types'
import type { DialogDefinition, DialogInput, DialogProps } from '@/components/Dialog/dialog.types'
import type { OverlayDefinition, OverlayInput, OverlayProps } from '@/components/Overlay/overlay.types'

/** Schema type корневого компонента Nova UI Kit. */
export const ROOT_SCHEMA_TYPE = 'nova-ui.root'

/** Параметры Root, который запускает layout и style engine UI Kit дерева. */
export interface RootProps extends NovaUiStyleIdentityProps {
  x?: number
  y?: number
  width?: number
  height?: number
  padding?: NovaUiSpacing
  style?: NovaUiInheritedTextStyle
  styleSheet?: string | NovaUiStyleSheetAsset
  background?: string
  border?: NovaUiBorder
  clip?: boolean
  display?: NovaUiStyleDisplay
  cursor?: NovaCursorDeclaration
  cursorContext?: NovaCursorContext
}

/** Нормализованные параметры Root. */
export interface RootResolvedProps extends NovaUiStyleIdentityProps {
  x: number
  y: number
  width: number
  height: number
  padding: NovaUiSpacing
  style?: NovaUiInheritedTextStyle
  styleSheet: string | NovaUiStyleSheetAsset
  background?: string
  border?: NovaUiBorder
  clip: boolean
  display: NovaUiStyleDisplay
  cursor?: NovaCursorDeclaration
  cursorContext?: NovaCursorContext
}

/** Schema ребенка Root. Каждый ребенок получает внутренний rect Root. */
export interface RootChildSchema<TProps = Record<string, any>> extends NovaElementSchema<TProps> {}

/** Schema корня UI Kit дерева. */
export interface RootSchema extends NovaComponentSchema<RootProps> {
  children?: Array<RootChildSchema>
}

/** Публичный API Root для runtime-управления stylesheet. */
export interface RootApi {
  setStyleSheetSource: (source: string | NovaUiStyleSheetAsset) => void
  setStyleSheetAsset: (asset: NovaUiStyleSheetAsset) => void
  resetStyleSheet: () => void
  refreshStyleTokens: () => void
  setStyleTokenResolver: (resolver: NovaUiStyleTokenResolver | null) => void
  validateStyleSheet: (source: string) => NovaUiStyleValidationResult
  setChildren: (children: Array<RootChildSchema>) => void
  getValidation: () => NovaUiStyleValidationResult
  getDiagnostics: () => ReadonlyArray<NovaUiStyleDiagnostic>
  getStyleSheetSource: () => string
  getCompiledStyleSheet: () => NovaUiCompiledStyleSheet
  getStyleMediaContext: () => NovaUiStyleMediaContext
  inspectStyleNode: (node: string | NovaUiStylableNode) => NovaUiStyleInspectionDebug | null
  relayout: () => void
  getChildRect: () => Readonly<NovaUiLayoutRect>
  registerTooltipDefinitions: (sourceId: string, definitions: Array<TooltipDefinition>) => void
  unregisterTooltipDefinitions: (sourceId: string) => void
  closeTooltip: (options?: { suppressMs?: number }) => void
  registerDialogDefinitions: (sourceId: string, definitions: Array<DialogDefinition>) => void
  unregisterDialogDefinitions: (sourceId: string) => void
  openDialog: (input: DialogInput, payload?: Record<string, unknown>) => string
  closeDialog: (id?: string, event?: Event) => void
  closeDialogs: (event?: Event) => void
  updateDialog: (id: string, patch: DialogProps & Record<string, unknown>) => void
  getOpenDialogIds: () => Array<string>
  registerOverlayDefinitions: (sourceId: string, definitions: Array<OverlayDefinition>) => void
  unregisterOverlayDefinitions: (sourceId: string) => void
  openOverlay: (input: OverlayInput, payload?: Record<string, unknown>) => string
  closeOverlay: (id?: string, event?: Event) => void
  closeOverlays: (event?: Event) => void
  updateOverlay: (id: string, patch: OverlayProps & Record<string, unknown>) => void
  getOpenOverlayIds: () => Array<string>
}
