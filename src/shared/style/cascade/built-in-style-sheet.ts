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

@keyframes fade-slide-in {
  from {
    opacity: 0;
    translate-y: -10;
  }

  to {
    opacity: 1;
    translate-y: 0;
  }
}

.fade-slide-in {
  animation: fade-slide-in 280ms outCubic;
}
`.trim()

let cachedBuiltInStyleSheet: NovaUiCompiledStyleSheet | null = null

export function getNovaUiBuiltInUtilityStyleSheet(): NovaUiCompiledStyleSheet {
  if (cachedBuiltInStyleSheet) return cachedBuiltInStyleSheet

  cachedBuiltInStyleSheet = compileStyleSheetIndexes(createBuiltInUtilityRules(), NOVA_UI_BUILT_IN_UTILITY_SOURCE, new Map([
    ['fade-slide-in', {
      name: 'fade-slide-in',
      frames: [
        { offset: 0, declarations: { opacity: 0, translateY: -10 } },
        { offset: 1, declarations: { opacity: 1, translateY: 0 } },
      ],
    }],
  ]))
  return cachedBuiltInStyleSheet
}

function createBuiltInUtilityRules(): Array<NovaUiCompiledStyleRule> {
  return [
    createUtilityRule('hidden', 'none', 0),
    createUtilityRule('shown', 'normal', 1),
    createAnimationUtilityRule(),
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

function createAnimationUtilityRule(): NovaUiCompiledStyleRule {
  return {
    selector: {
      raw: '.fade-slide-in',
      parts: [
        {
          classes: ['fade-slide-in'],
          attrs: {},
          pseudos: [],
        },
      ],
      combinators: [],
      specificity: 10,
    },
    declarations: {
      animation: {
        name: 'fade-slide-in',
        duration: 280,
        easing: 'outCubic',
      },
      mask: NovaUiStyleMask.None,
    },
    order: 2,
    rightMostClasses: [],
  }
}
