import { useCallback, useSyncExternalStore } from 'react'

/**
 * Module-level singleton store for per-row disclosure state (collapsed /
 * expanded panes inside `ReasoningComponent` and `ToolCallComponent`). Lives
 * outside React's component tree so virtualized rows that unmount and
 * remount on scroll see the same state — without it, scrolling away from an
 * expanded reasoning pane and back would silently collapse it.
 *
 * Subscribers go through `useSyncExternalStore` with a key-scoped snapshot,
 * so a toggle on key `A` doesn't re-render rows reading key `B`.
 */

const data = new Map<string, boolean>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getValue(key: string): boolean {
  return data.get(key) ?? false
}

function setValue(key: string, next: boolean): void {
  if (data.get(key) === next) return
  data.set(key, next)
  listeners.forEach((l) => l())
}

/**
 * Subscribe to a boolean disclosure flag keyed by `key`. Defaults to `false`.
 * The toggle is referentially stable for the same key, so callers can pass it
 * straight to `onClick` without invalidating memoized children.
 */
export function useDisclosure(key: string): [boolean, () => void] {
  const isOpen = useSyncExternalStore(
    subscribe,
    () => getValue(key),
    () => false
  )
  const toggle = useCallback(() => {
    setValue(key, !getValue(key))
  }, [key])
  return [isOpen, toggle]
}

/** Test-only — drop all keys and listeners. */
export function _resetDisclosureStore(): void {
  data.clear()
  listeners.clear()
}
