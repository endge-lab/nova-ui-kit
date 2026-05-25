import type {
  NovaComponentCreateContext,
  NovaComponentDescriptor,
  NovaComponentNode,
  NovaComponentSchema,
} from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  normalizeCommonProps,
} from '@/shared/component'
import {
  DIALOGS_SCHEMA_TYPE,
  type DialogsApi,
  type DialogsProps,
  type DialogsResolvedProps,
} from '@/components/Dialog/dialog.types'

export type DialogsDescriptor = NovaComponentDescriptor<
  DialogsResolvedProps,
  DialogsApi,
  Record<string, never>,
  DialogsProps
>

export type DialogsNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<DialogsProps>,
) => NovaComponentNode<DialogsResolvedProps, DialogsApi, Record<string, never>, DialogsProps, E>

export const DIALOGS_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  definitions: { type: 'array' },
} as const

/** Нормализует props registry-компонента Dialogs. */
export function normalizeDialogsProps(props: DialogsProps = {}): DialogsResolvedProps {
  return {
    ...normalizeCommonProps(props, {
      width: 0,
      height: 0,
      display: 'none',
    }),
    display: 'none',
    definitions: props.definitions ?? [],
  }
}

/** Создает descriptor для Dialogs registry-node. */
export function createDialogsDescriptor(createNode?: DialogsNodeFactory): DialogsDescriptor {
  const descriptor: DialogsDescriptor = {
    type: DIALOGS_SCHEMA_TYPE,
    name: 'Dialogs',
    title: 'Dialogs',
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: NOVA_UI_COMMON_DIRTY_POLICY.update,
      render: [...NOVA_UI_COMMON_DIRTY_POLICY.render, 'definitions'],
    },
    fields: DIALOGS_FIELD_DEFINITIONS,
    normalize: schema => normalizeDialogsProps(schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, normalizeDialogsProps),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

export const DIALOGS_NODE_DESCRIPTOR = createDialogsDescriptor()
