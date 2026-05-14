import { compileStyleSheetIndexes } from '@/shared/style/cascade/style-selector-matcher'
import { NovaUiStyleMask } from '@/shared/style/style-context'
import type {
  NovaUiCompiledStyleRule,
  NovaUiCompiledStyleSheet,
} from '@/shared/style/cascade/style-sheet'

const NOVA_UI_BUILT_IN_UTILITY_SOURCE = `
.hidden {
  display: none;
}

.shown {
  display: normal;
}
`.trim()

let cachedBuiltInStyleSheet: NovaUiCompiledStyleSheet | null = null

export function getNovaUiBuiltInUtilityStyleSheet(): NovaUiCompiledStyleSheet {
  if (cachedBuiltInStyleSheet) return cachedBuiltInStyleSheet

  cachedBuiltInStyleSheet = compileStyleSheetIndexes(createBuiltInUtilityRules(), NOVA_UI_BUILT_IN_UTILITY_SOURCE)
  return cachedBuiltInStyleSheet
}

function createBuiltInUtilityRules(): Array<NovaUiCompiledStyleRule> {
  return [
    createUtilityRule('hidden', 'none', 0),
    createUtilityRule('shown', 'normal', 1),
  ]
}

function createUtilityRule(
  className: string,
  display: 'none' | 'normal',
  order: number,
): NovaUiCompiledStyleRule {
  return {
    selector: {
      raw: `.${className}`,
      parts: [
        {
          classes: [className],
          attrs: {},
          pseudos: [],
        },
      ],
      combinators: [],
      specificity: 10,
    },
    declarations: {
      layout: { display },
      mask: NovaUiStyleMask.None,
    },
    order,
    rightMostClasses: [],
  }
}
