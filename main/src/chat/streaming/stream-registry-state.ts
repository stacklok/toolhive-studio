import type { WebContents } from 'electron'
import type {
  ActiveStream,
  PersistMessagesSync,
  StreamRegistryRuntime,
} from './stream-registry-types'

let activeRegistry: StreamRegistryRuntime | null = null

export function setActiveRegistry(registry: StreamRegistryRuntime): void {
  activeRegistry = registry
}

export function getActiveRegistry(): StreamRegistryRuntime | null {
  return activeRegistry
}

export function requireRegistry(): StreamRegistryRuntime {
  if (!activeRegistry) {
    throw new Error('Stream registry has not been initialized')
  }
  return activeRegistry
}

export function getStreams(): Map<string, ActiveStream> {
  return activeRegistry?.streams ?? new Map()
}

export function getPersistMessages(): PersistMessagesSync | undefined {
  return activeRegistry?.persistMessages
}

export function isRegistryShuttingDown(): boolean {
  return activeRegistry?.isShuttingDown ?? false
}

export function markRegistryShuttingDown(): void {
  if (activeRegistry) {
    activeRegistry.isShuttingDown = true
  }
}

/** Remove a destroyed renderer from every subscriber set. */
export function purgeSender(sender: WebContents): void {
  for (const stream of getStreams().values()) {
    stream.subscribers.delete(sender)
  }
}

/** Test-only helper. */
export function _resetActiveStreamsForTests(): void {
  const registry = activeRegistry
  if (!registry) return
  for (const stream of registry.streams.values()) {
    if (stream.persistTimer) clearTimeout(stream.persistTimer)
  }
  registry.streams.clear()
  registry.isShuttingDown = false
}
