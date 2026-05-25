import { NovaPhase, type NovaApp, type NovaNode } from '@endge/nova'
import type { EventList } from '@endge/utils'

export interface NovaUiStyleDirtyPolicy {
  update?: boolean
  matrix?: boolean
  render?: boolean
}

export interface NovaUiStyleTokenRead {
  token: string
  dirty: NovaUiStyleDirtyPolicy
  scope?: NovaUiStyleTokenScope
}

export type NovaUiStyleTokenScope = 'local' | 'global'

export interface NovaUiTrackedStyleTokenResolver {
  token(name: string, fallback?: string, dirty?: NovaUiStyleDirtyPolicy): string
  record(name: string, dirty?: NovaUiStyleDirtyPolicy, scope?: NovaUiStyleTokenScope): void
}

interface OwnerState {
  reads: Map<string, NovaUiStyleTokenRead>
  disposers: Map<string, Array<() => void>>
}

const DEFAULT_TOKEN_DIRTY: NovaUiStyleDirtyPolicy = { render: true }
const APP_SCOPE_IDS = new WeakMap<object, string>()
let nextAppScopeId = 1

/** Хранит owner -> token atoms и atom -> owner подписки для NovaCSS runtime reads. */
export class NovaUiStyleDependencyTracker<E extends EventList = Record<string, any>> {
  private readonly owners = new WeakMap<NovaNode<E>, OwnerState>()
  private readonly atomOwners = new Map<string, Set<NovaNode<E>>>()

  /** Обновляет список token dependencies owner-а и перестраивает Raph subscriptions. */
  updateOwnerDependencies(owner: NovaNode<E>, reads: Iterable<NovaUiStyleTokenRead>): void {
    const state = this.resolveOwnerState(owner)
    const nextReads = new Map<string, NovaUiStyleTokenRead>()

    for (const read of reads) {
      const key = styleTokenReadKey(owner.nova, read)
      const existing = nextReads.get(key)
      nextReads.set(key, existing
        ? { ...read, dirty: mergeDirtyPolicies(existing.dirty, read.dirty) }
        : { ...read, dirty: normalizeDirtyPolicy(read.dirty) })
    }

    for (const key of state.reads.keys()) {
      if (nextReads.has(key)) continue
      this.unsubscribeOwnerAtom(owner, state, key)
    }

    for (const [key, read] of nextReads) {
      const previous = state.reads.get(key)
      if (previous && sameDirtyPolicy(previous.dirty, read.dirty)) continue

      if (previous) this.unsubscribeOwnerAtom(owner, state, key)
      state.reads.set(key, read)
      this.subscribeOwnerAtom(owner, state, key, read)
    }
  }

  /** Удаляет все подписки owner-а. */
  clearOwner(owner: NovaNode<E>): void {
    const state = this.owners.get(owner)
    if (!state) return

    for (const key of [...state.reads.keys()]) {
      this.unsubscribeOwnerAtom(owner, state, key)
    }
    this.owners.delete(owner)
  }

  /** Возвращает количество активных owner subscriptions для benchmark/debug. */
  subscriptionCount(): number {
    let total = 0
    for (const owners of this.atomOwners.values()) total += owners.size
    return total
  }

  private resolveOwnerState(owner: NovaNode<E>): OwnerState {
    const existing = this.owners.get(owner)
    if (existing) return existing

    const state: OwnerState = {
      reads: new Map(),
      disposers: new Map(),
    }
    this.owners.set(owner, state)
    return state
  }

  private subscribeOwnerAtom(
    owner: NovaNode<E>,
    state: OwnerState,
    key: string,
    read: NovaUiStyleTokenRead,
  ): void {
    const phases = dirtyPolicyToPhases(read.dirty)
    const path = createNovaUiStyleTokenDataPath(owner.nova, read.token, read.scope)
    state.disposers.set(key, phases.map(phase => owner.observeData(path, { phase })))

    let owners = this.atomOwners.get(key)
    if (!owners) {
      owners = new Set()
      this.atomOwners.set(key, owners)
    }
    owners.add(owner)
  }

  private unsubscribeOwnerAtom(owner: NovaNode<E>, state: OwnerState, key: string): void {
    for (const dispose of state.disposers.get(key) ?? []) dispose()
    state.disposers.delete(key)
    state.reads.delete(key)

    const owners = this.atomOwners.get(key)
    owners?.delete(owner)
    if (owners?.size === 0) this.atomOwners.delete(key)
  }
}

/** Создает resolver, который во время исполнения записывает token dependencies nearest owner-а. */
export function createNovaUiTrackedStyleTokenResolver<E extends EventList>(
  owner: NovaNode<E>,
  resolve: (name: string, fallback?: string) => string | undefined,
  tracker: NovaUiStyleDependencyTracker<E>,
): NovaUiTrackedStyleTokenResolver {
  const reads = new Map<string, NovaUiStyleTokenRead>()

  return {
    token(name, fallback, dirty = DEFAULT_TOKEN_DIRTY) {
      this.record(name, dirty)
      return resolve(name, fallback) ?? fallback ?? ''
    },
    record(name, dirty = DEFAULT_TOKEN_DIRTY, scope = 'local') {
      const normalizedName = normalizeStyleTokenName(name)
      const key = `${scope}:${normalizedName}`
      const previous = reads.get(key)
      reads.set(key, {
        token: normalizedName,
        scope,
        dirty: previous ? mergeDirtyPolicies(previous.dirty, dirty) : normalizeDirtyPolicy(dirty),
      })
      tracker.updateOwnerDependencies(owner, reads.values())
    },
  }
}

/** Путь app-local/global token atom в Raph data-store. */
export function createNovaUiStyleTokenDataPath(
  app: NovaApp<any>,
  token: string,
  scope: NovaUiStyleTokenScope = 'local',
): string {
  const tokenId = encodeNovaUiStyleToken(normalizeStyleTokenName(token))
  if (scope === 'global') return `nova.ui.styles.global.tokens.${tokenId}.version`
  return `nova.ui.styles.apps.${getNovaUiAppStyleScopeId(app)}.tokens.${tokenId}.version`
}

/** Увеличивает версии token atoms, чтобы Raph доставил dirty только подписанным owners. */
export function bumpNovaUiStyleTokenVersions(
  app: NovaApp<any>,
  tokens: Iterable<string>,
  scope: NovaUiStyleTokenScope = 'local',
): void {
  app.raph.kernel.transaction(() => {
    for (const token of tokens) {
      const path = createNovaUiStyleTokenDataPath(app, token, scope)
      const previous = app.raph.kernel.get(path)
      app.raph.kernel.set(path, typeof previous === 'number' ? previous + 1 : 1)
    }
  })
}

export function getNovaUiAppStyleScopeId(app: NovaApp<any>): string {
  const existing = APP_SCOPE_IDS.get(app)
  if (existing) return existing

  const next = `a_${nextAppScopeId.toString(36)}`
  nextAppScopeId += 1
  APP_SCOPE_IDS.set(app, next)
  return next
}

export function encodeNovaUiStyleToken(token: string): string {
  let hash = 5381
  for (let index = 0; index < token.length; index += 1) {
    hash = ((hash << 5) + hash) ^ token.charCodeAt(index)
  }
  return `t_${(hash >>> 0).toString(36)}`
}

function styleTokenReadKey(app: NovaApp<any>, read: NovaUiStyleTokenRead): string {
  return createNovaUiStyleTokenDataPath(app, read.token, read.scope)
}

function normalizeStyleTokenName(name: string): string {
  return name.startsWith('--') ? name : `--${name}`
}

function normalizeDirtyPolicy(policy: NovaUiStyleDirtyPolicy = DEFAULT_TOKEN_DIRTY): NovaUiStyleDirtyPolicy {
  return {
    update: policy.update === true,
    matrix: policy.matrix === true,
    render: policy.render !== false && (policy.render === true || !policy.update && !policy.matrix),
  }
}

function mergeDirtyPolicies(left: NovaUiStyleDirtyPolicy, right: NovaUiStyleDirtyPolicy): NovaUiStyleDirtyPolicy {
  return {
    update: left.update || right.update,
    matrix: left.matrix || right.matrix,
    render: left.render || right.render,
  }
}

function sameDirtyPolicy(left: NovaUiStyleDirtyPolicy, right: NovaUiStyleDirtyPolicy): boolean {
  return left.update === right.update
    && left.matrix === right.matrix
    && left.render === right.render
}

function dirtyPolicyToPhases(policy: NovaUiStyleDirtyPolicy): Array<string> {
  const phases: Array<string> = []
  if (policy.update) phases.push(NovaPhase.Update)
  if (policy.matrix) phases.push(NovaPhase.Matrix)
  if (policy.render) phases.push(NovaPhase.Render)
  return phases
}
