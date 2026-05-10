import type { NovaComponentSchema, NovaCursorContext, NovaCursorDeclaration } from '@endge/nova'
import type {
  NovaUiLayoutRect,
  NovaUiSpacing,
} from '@/shared/layout'
import type {
  NovaUiBorder,
  NovaUiInheritedTextStyle,
  NovaUiStyleDiagnostic,
  NovaUiStyleIdentityProps,
  NovaUiStyleValidationResult,
} from '@/shared/style'

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
  styleSheet?: string
  background?: string
  border?: NovaUiBorder
  clip?: boolean
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
  styleSheet: string
  background?: string
  border?: NovaUiBorder
  clip: boolean
  cursor?: NovaCursorDeclaration
  cursorContext?: NovaCursorContext
}

/** Schema ребенка Root. Каждый ребенок получает внутренний rect Root. */
export interface RootChildSchema<TProps = Record<string, any>> extends NovaComponentSchema<TProps> {}

/** Schema корня UI Kit дерева. */
export interface RootSchema extends NovaComponentSchema<RootProps> {
  children?: RootChildSchema[]
}

/** Публичный API Root для runtime-управления stylesheet. */
export interface RootApi {
  setStyleSheetSource: (source: string) => void
  resetStyleSheet: () => void
  validateStyleSheet: (source: string) => NovaUiStyleValidationResult
  setChildren: (children: RootChildSchema[]) => void
  getValidation: () => NovaUiStyleValidationResult
  getDiagnostics: () => readonly NovaUiStyleDiagnostic[]
  relayout: () => void
  getChildRect: () => Readonly<NovaUiLayoutRect>
}
