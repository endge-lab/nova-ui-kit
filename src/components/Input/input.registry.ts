import type { NovaSchemaRegistry } from '@endge/nova'
import {
  Input,
  InputField,
  NumberInput,
  PasswordInput,
  SearchInput,
  SelectInput,
  TextArea,
  TextInput,
} from '@/components/Input/Input'
import {
  INPUT_FIELD_DEFINITIONS,
  createInputDescriptor,
  normalizeInputProps,
  type InputDescriptor,
} from '@/components/Input/input.config'
import {
  INPUT_FIELD_SCHEMA_TYPE,
  INPUT_SCHEMA_TYPE,
  NUMBER_INPUT_SCHEMA_TYPE,
  PASSWORD_INPUT_SCHEMA_TYPE,
  SEARCH_INPUT_SCHEMA_TYPE,
  SELECT_INPUT_SCHEMA_TYPE,
  TEXT_AREA_SCHEMA_TYPE,
  TEXT_INPUT_SCHEMA_TYPE,
  type InputComponentKind,
  type InputSchema,
} from '@/components/Input/input.types'

function createDescriptor(
  type: string,
  name: string,
  kind: InputComponentKind,
  NodeCtor: any,
): InputDescriptor {
  const descriptor = createInputDescriptor(type, name, kind, (context, schema) => {
    const inputSchema = schema as InputSchema
    return new NodeCtor(
      context.app,
      context.surface,
      normalizeInputProps(inputSchema.props, kind),
      { componentId: inputSchema.id, kind },
      descriptor,
    )
  })
  return descriptor
}

export const INPUT_DESCRIPTOR = createDescriptor(INPUT_SCHEMA_TYPE, 'Input', 'input', Input)
export const TEXT_INPUT_DESCRIPTOR = createDescriptor(TEXT_INPUT_SCHEMA_TYPE, 'TextInput', 'text', TextInput)
export const PASSWORD_INPUT_DESCRIPTOR = createDescriptor(PASSWORD_INPUT_SCHEMA_TYPE, 'PasswordInput', 'password', PasswordInput)
export const SEARCH_INPUT_DESCRIPTOR = createDescriptor(SEARCH_INPUT_SCHEMA_TYPE, 'SearchInput', 'search', SearchInput)
export const NUMBER_INPUT_DESCRIPTOR = createDescriptor(NUMBER_INPUT_SCHEMA_TYPE, 'NumberInput', 'number', NumberInput)
export const TEXT_AREA_DESCRIPTOR = createDescriptor(TEXT_AREA_SCHEMA_TYPE, 'TextArea', 'textarea', TextArea)
export const INPUT_FIELD_DESCRIPTOR = createDescriptor(INPUT_FIELD_SCHEMA_TYPE, 'InputField', 'field', InputField)
export const SELECT_INPUT_DESCRIPTOR = createDescriptor(SELECT_INPUT_SCHEMA_TYPE, 'SelectInput', 'select', SelectInput)

export const INPUT_DESCRIPTORS: Array<InputDescriptor> = [
  INPUT_DESCRIPTOR,
  TEXT_INPUT_DESCRIPTOR,
  PASSWORD_INPUT_DESCRIPTOR,
  SEARCH_INPUT_DESCRIPTOR,
  NUMBER_INPUT_DESCRIPTOR,
  TEXT_AREA_DESCRIPTOR,
  INPUT_FIELD_DESCRIPTOR,
  SELECT_INPUT_DESCRIPTOR,
]

export { INPUT_FIELD_DEFINITIONS }

export function registerInput(registry: { register: (descriptor: InputDescriptor, options?: { override?: boolean }) => void }): void {
  for (const descriptor of INPUT_DESCRIPTORS) registry.register(descriptor, { override: true })
}

export function registerInputSchema(registry: NovaSchemaRegistry): void {
  registerInput(registry)
}
