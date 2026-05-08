import { FLEX_SCHEMA_TYPE } from '@/components/Flex/types'
import { GRID_SCHEMA_TYPE } from '@/components/Grid/types'
import { ROOT_SCHEMA_TYPE } from '@/components/Root/types'
import { TEXT_BLOCK_SCHEMA_TYPE } from '@/components/TextBlock/types'

/** Группировка schema type для более читаемого UI Kit DSL. */
export const NovaUiKit = {
  Root: ROOT_SCHEMA_TYPE,
  Flex: FLEX_SCHEMA_TYPE,
  Grid: GRID_SCHEMA_TYPE,
  TextBlock: TEXT_BLOCK_SCHEMA_TYPE,
} as const
