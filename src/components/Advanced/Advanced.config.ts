import type { NovaComponentCreateContext, NovaComponentDescriptor, NovaComponentNode, NovaComponentSchema } from '@endge/nova'
import type { EventList } from '@endge/utils'
import {
  NOVA_UI_COMMON_DIRTY_POLICY,
  NOVA_UI_COMMON_FIELD_DEFINITIONS,
  commonMeasureBounds,
  normalizeCommonProps,
} from '@/shared/component'
import {
  ACCORDION_SCHEMA_TYPE,
  BLOCK_UI_SCHEMA_TYPE,
  CAROUSEL_SCHEMA_TYPE,
  DIALOG_SCHEMA_TYPE,
  DOCK_SCHEMA_TYPE,
  DRAWER_SCHEMA_TYPE,
  FIELDSET_SCHEMA_TYPE,
  GALLERIA_SCHEMA_TYPE,
  IMAGE_COMPARE_SCHEMA_TYPE,
  IMAGE_PREVIEW_SCHEMA_TYPE,
  KNOB_SCHEMA_TYPE,
  MESSAGE_SCHEMA_TYPE,
  METER_GROUP_SCHEMA_TYPE,
  POPOVER_SCHEMA_TYPE,
  PROGRESS_BAR_SCHEMA_TYPE,
  PROGRESS_SPINNER_SCHEMA_TYPE,
  RADIO_BUTTON_SCHEMA_TYPE,
  RATING_SCHEMA_TYPE,
  SELECT_BUTTON_SCHEMA_TYPE,
  SKELETON_SCHEMA_TYPE,
  SPEED_DIAL_SCHEMA_TYPE,
  STEPPER_SCHEMA_TYPE,
  TABS_SCHEMA_TYPE,
  TOAST_SCHEMA_TYPE,
  TOGGLE_SWITCH_SCHEMA_TYPE,
  type AdvancedComponentApi,
  type AdvancedComponentKind,
  type AdvancedComponentProps,
  type AdvancedComponentResolvedProps,
} from '@/components/Advanced/Advanced.types'

export type AdvancedComponentDescriptor = NovaComponentDescriptor<AdvancedComponentResolvedProps, AdvancedComponentApi, Record<string, never>, AdvancedComponentProps>

export type AdvancedComponentNodeFactory = <E extends EventList>(
  context: NovaComponentCreateContext<E>,
  schema: NovaComponentSchema<AdvancedComponentProps>,
) => NovaComponentNode<AdvancedComponentResolvedProps, AdvancedComponentApi, Record<string, never>, AdvancedComponentProps, E>

export const ADVANCED_COMPONENT_SCHEMA_TYPES: Record<AdvancedComponentKind, string> = {
  SpeedDial: SPEED_DIAL_SCHEMA_TYPE,
  Dock: DOCK_SCHEMA_TYPE,
  Carousel: CAROUSEL_SCHEMA_TYPE,
  Galleria: GALLERIA_SCHEMA_TYPE,
  ImagePreview: IMAGE_PREVIEW_SCHEMA_TYPE,
  ImageCompare: IMAGE_COMPARE_SCHEMA_TYPE,
  Skeleton: SKELETON_SCHEMA_TYPE,
  ProgressBar: PROGRESS_BAR_SCHEMA_TYPE,
  ProgressSpinner: PROGRESS_SPINNER_SCHEMA_TYPE,
  MeterGroup: METER_GROUP_SCHEMA_TYPE,
  Knob: KNOB_SCHEMA_TYPE,
  ToggleSwitch: TOGGLE_SWITCH_SCHEMA_TYPE,
  RadioButton: RADIO_BUTTON_SCHEMA_TYPE,
  Rating: RATING_SCHEMA_TYPE,
  SelectButton: SELECT_BUTTON_SCHEMA_TYPE,
  Dialog: DIALOG_SCHEMA_TYPE,
  Drawer: DRAWER_SCHEMA_TYPE,
  Popover: POPOVER_SCHEMA_TYPE,
  Toast: TOAST_SCHEMA_TYPE,
  Message: MESSAGE_SCHEMA_TYPE,
  BlockUI: BLOCK_UI_SCHEMA_TYPE,
  Accordion: ACCORDION_SCHEMA_TYPE,
  Fieldset: FIELDSET_SCHEMA_TYPE,
  Tabs: TABS_SCHEMA_TYPE,
  Stepper: STEPPER_SCHEMA_TYPE,
}

export const ADVANCED_COMPONENT_FIELD_DEFINITIONS = {
  ...NOVA_UI_COMMON_FIELD_DEFINITIONS,
  title: { type: 'string' },
  subtitle: { type: 'string' },
  text: { type: 'string' },
  value: { type: 'any' },
  max: { type: 'number' },
  min: { type: 'number' },
  items: { type: 'array' },
  activeIndex: { type: 'number' },
  open: { type: 'boolean' },
  checked: { type: 'boolean' },
  expanded: { type: 'boolean' },
  blocked: { type: 'boolean' },
  severity: { type: 'string' },
  orientation: { type: 'string' },
  direction: { type: 'string' },
  mode: { type: 'string' },
  image: { type: 'icon' },
  compareImage: { type: 'icon' },
  rating: { type: 'number' },
  autoPlay: { type: 'boolean' },
  animation: { type: 'string' },
  parts: { type: 'record' },
  onChange: { type: 'function' },
  onPress: { type: 'function' },
} as const

export function normalizeAdvancedComponentProps(
  kind: AdvancedComponentKind,
  props: AdvancedComponentProps = {},
): AdvancedComponentResolvedProps {
  const defaults = resolveAdvancedDefaults(kind, props)

  return {
    ...normalizeCommonProps(props, defaults),
    kind,
    title: props.title ?? '',
    subtitle: props.subtitle ?? '',
    text: props.text ?? '',
    value: props.value ?? defaults.value ?? 0,
    max: finite(props.max, defaults.max ?? 100),
    min: finite(props.min, defaults.min ?? 0),
    items: props.items ?? defaults.items ?? [],
    activeIndex: Math.max(0, Math.trunc(finite(props.activeIndex, defaults.activeIndex ?? 0))),
    open: props.open ?? defaults.open ?? true,
    checked: props.checked ?? defaults.checked ?? false,
    expanded: props.expanded ?? defaults.expanded ?? true,
    blocked: props.blocked ?? defaults.blocked ?? false,
    severity: props.severity ?? defaults.severity ?? 'neutral',
    orientation: props.orientation ?? defaults.orientation ?? 'horizontal',
    direction: props.direction ?? defaults.direction ?? 'up',
    mode: props.mode ?? defaults.mode ?? 'default',
    image: props.image ?? defaults.image,
    compareImage: props.compareImage ?? defaults.compareImage,
    rating: finite(props.rating, defaults.rating ?? 0),
    autoPlay: props.autoPlay ?? defaults.autoPlay ?? false,
    animation: props.animation ?? defaults.animation ?? 'fade',
    parts: props.parts ?? defaults.parts,
    onChange: props.onChange,
    onPress: props.onPress,
  }
}

export function createAdvancedComponentDescriptor(
  kind: AdvancedComponentKind,
  createNode?: AdvancedComponentNodeFactory,
): AdvancedComponentDescriptor {
  const descriptor: AdvancedComponentDescriptor = {
    type: ADVANCED_COMPONENT_SCHEMA_TYPES[kind],
    name: kind,
    title: kind,
    version: '0.1.0',
    kind: 'node-component',
    dirtyPolicy: {
      matrix: NOVA_UI_COMMON_DIRTY_POLICY.matrix,
      update: [...NOVA_UI_COMMON_DIRTY_POLICY.update, 'items', 'orientation', 'direction', 'mode'],
      render: [
        ...NOVA_UI_COMMON_DIRTY_POLICY.render,
        'title',
        'subtitle',
        'text',
        'value',
        'max',
        'min',
        'activeIndex',
        'open',
        'checked',
        'expanded',
        'blocked',
        'severity',
        'image',
        'compareImage',
        'rating',
        'autoPlay',
        'animation',
        'parts',
      ],
    },
    fields: ADVANCED_COMPONENT_FIELD_DEFINITIONS,
    normalize: schema => normalizeAdvancedComponentProps(kind, schema.props),
    measureBounds: (_context, schema) => commonMeasureBounds(schema, props => normalizeAdvancedComponentProps(kind, props)),
  }

  if (createNode) descriptor.createNode = createNode
  return descriptor
}

function resolveAdvancedDefaults(
  kind: AdvancedComponentKind,
  props: AdvancedComponentProps,
): Partial<AdvancedComponentResolvedProps> {
  const severity = props.severity ?? 'neutral'
  const tone = severityPalette(severity)

  switch (kind) {
    case 'SpeedDial':
      return { width: 220, height: 180, background: 'rgba(15, 23, 42, 0.04)', border: { color: '#dbe4ef', width: 1, radius: 14 }, items: defaultIconItems(), open: true, direction: 'up-right', animation: 'radial' }
    case 'Dock':
      return { width: 360, height: 72, background: 'rgba(255,255,255,0.82)', border: { color: '#cbd5e1', width: 1, radius: 18 }, items: defaultIconItems(), animation: 'spring' }
    case 'Carousel':
    case 'Galleria':
      return { width: 360, height: 180, background: '#f8fafc', border: { color: '#dbe4ef', width: 1, radius: 14 }, items: defaultGalleryItems(), activeIndex: 1, animation: 'slide' }
    case 'ImagePreview':
    case 'ImageCompare':
      return { width: 320, height: 180, background: '#e0f2fe', border: { color: '#bae6fd', width: 1, radius: 14 }, value: 52, animation: 'scale' }
    case 'Skeleton':
      return { width: 280, height: 96, background: '#e2e8f0', border: { color: '#e2e8f0', width: 1, radius: 12 }, animation: 'shimmer' }
    case 'ProgressBar':
      return { width: 280, height: 18, background: '#e2e8f0', border: { color: '#dbe4ef', width: 1, radius: 999 }, value: 64, accentColor: '#2563eb', animation: 'meterSweep' }
    case 'ProgressSpinner':
      return { width: 96, height: 96, background: 'rgba(255,255,255,0)', value: 72, accentColor: '#2563eb', animation: 'spring' }
    case 'MeterGroup':
      return { width: 320, height: 72, background: '#f8fafc', border: { color: '#dbe4ef', width: 1, radius: 12 }, items: defaultMeterItems(), animation: 'meterSweep' }
    case 'Knob':
      return { width: 112, height: 112, background: '#f8fafc', border: { color: '#dbe4ef', width: 1, radius: 16 }, value: 68, accentColor: '#0f766e' }
    case 'ToggleSwitch':
      return { width: 72, height: 34, background: '#cbd5e1', border: { color: '#cbd5e1', width: 1, radius: 999 }, checked: true, accentColor: '#2563eb', animation: 'spring' }
    case 'RadioButton':
      return { width: 180, height: 32, background: 'rgba(255,255,255,0)', checked: true, accentColor: '#2563eb', text: 'Selected option' }
    case 'Rating':
      return { width: 160, height: 32, background: 'rgba(255,255,255,0)', rating: 4, accentColor: '#f59e0b', animation: 'spring' }
    case 'SelectButton':
      return { width: 260, height: 40, background: '#e2e8f0', border: { color: '#dbe4ef', width: 1, radius: 10 }, items: defaultSelectItems(), value: 'canvas', animation: 'activeIndicator' }
    case 'Dialog':
      return { width: 320, height: 180, background: '#ffffff', border: { color: '#cbd5e1', width: 1, radius: 14 }, title: 'Dialog', subtitle: 'Layered modal surface', open: true, animation: 'scale' }
    case 'Drawer':
      return { width: 280, height: 190, background: '#ffffff', border: { color: '#cbd5e1', width: 1, radius: 14 }, title: 'Drawer', subtitle: 'Pinned command panel', direction: 'right', animation: 'slide' }
    case 'Popover':
      return { width: 240, height: 118, background: '#ffffff', border: { color: '#cbd5e1', width: 1, radius: 12 }, title: 'Popover', subtitle: 'Anchored contextual layer', animation: 'fade' }
    case 'Toast':
      return { width: 300, height: 76, background: tone.background, border: { color: tone.border, width: 1, radius: 12 }, title: 'Saved', subtitle: 'Runtime settings updated', severity, animation: 'slide' }
    case 'Message':
      return { width: 300, height: 48, background: tone.background, border: { color: tone.border, width: 1, radius: 10 }, text: 'Message with configurable tone', severity }
    case 'BlockUI':
      return { width: 280, height: 130, background: '#f8fafc', border: { color: '#dbe4ef', width: 1, radius: 12 }, blocked: true, title: 'Blocked surface', subtitle: 'Mask opacity and content are tokenized', animation: 'maskFade' }
    case 'Accordion':
    case 'Fieldset':
      return { width: 320, height: 134, background: '#ffffff', border: { color: '#dbe4ef', width: 1, radius: 12 }, title: kind, expanded: true, items: defaultSelectItems(), animation: 'slide' }
    case 'Tabs':
      return { width: 340, height: 136, background: '#ffffff', border: { color: '#dbe4ef', width: 1, radius: 12 }, items: defaultSelectItems(), activeIndex: 1, animation: 'activeIndicator' }
    case 'Stepper':
      return { width: 340, height: 92, background: '#ffffff', border: { color: '#dbe4ef', width: 1, radius: 12 }, items: defaultStepItems(), activeIndex: 1, animation: 'stepAdvance' }
  }
}

export function severityPalette(severity: string): { background: string; color: string; border: string; accent: string } {
  const palettes: Record<string, { background: string; color: string; border: string; accent: string }> = {
    neutral: { background: '#f8fafc', color: '#334155', border: '#cbd5e1', accent: '#64748b' },
    info: { background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', accent: '#2563eb' },
    success: { background: '#ecfdf5', color: '#047857', border: '#a7f3d0', accent: '#059669' },
    warning: { background: '#fffbeb', color: '#b45309', border: '#fde68a', accent: '#d97706' },
    danger: { background: '#fef2f2', color: '#b91c1c', border: '#fecaca', accent: '#dc2626' },
  }

  return palettes[severity] ?? palettes.neutral
}

function finite(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function defaultIconItems() {
  return [
    { label: 'Edit', value: 'edit', color: '#2563eb' },
    { label: 'Copy', value: 'copy', color: '#0891b2' },
    { label: 'Share', value: 'share', color: '#7c3aed' },
    { label: 'Pin', value: 'pin', color: '#f59e0b' },
  ]
}

function defaultGalleryItems() {
  return [
    { label: 'North', value: 'north', color: '#0ea5e9' },
    { label: 'Ops', value: 'ops', color: '#10b981' },
    { label: 'Night', value: 'night', color: '#6366f1' },
  ]
}

function defaultMeterItems() {
  return [
    { label: 'CPU', value: '32', color: '#0ea5e9' },
    { label: 'GPU', value: '26', color: '#10b981' },
    { label: 'IO', value: '18', color: '#f59e0b' },
  ]
}

function defaultSelectItems() {
  return [
    { label: 'DOM', value: 'dom' },
    { label: 'Canvas', value: 'canvas' },
    { label: 'WebGL', value: 'webgl' },
  ]
}

function defaultStepItems() {
  return [
    { label: 'Schema', value: 'schema' },
    { label: 'Motion', value: 'motion' },
    { label: 'Smoke', value: 'smoke' },
  ]
}
