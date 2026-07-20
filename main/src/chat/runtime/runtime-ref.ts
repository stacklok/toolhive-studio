import type { ManagedRuntime } from 'effect'
import { isChatRuntimeReady } from './health'

/**
 * Untyped holder for the app ManagedRuntime.
 * Kept separate from `managed-runtime.ts` so domain services can read the
 * live runtime without importing the ChatLiveLayer (avoids cycles).
 * `any` is intentional: ChatServices lives in managed-runtime and cannot be
 * imported here without reintroducing the cycle.
 */
export type AnyChatRuntime = ManagedRuntime.ManagedRuntime<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  any,
  never
>

let managedRuntime: AnyChatRuntime | null = null

export function setManagedRuntime(runtime: AnyChatRuntime | null): void {
  managedRuntime = runtime
}

/** Raw instance — may exist while health is still `initializing`. */
export function getManagedRuntimeInstance(): AnyChatRuntime | null {
  return managedRuntime
}

/**
 * Atomically returns the live runtime only when health is `ready` and the
 * instance still exists.
 */
export function getManagedRuntime(): AnyChatRuntime | null {
  if (!isChatRuntimeReady()) return null
  return managedRuntime
}
