import type { WebContents } from 'electron'
import type {
  ActiveStream,
  PersistMessagesSync,
  StreamRegistryRuntime,
} from './stream-registry-types'

/**
 * Process-lifetime stream map. Kept stable across runtime restarts so a
 * finishing stream's teardown cannot delete a newly registered entry that
 * reused the same chatId after a Map swap.
 */
const streams = new Map<string, ActiveStream>()

let persistMessages: PersistMessagesSync | undefined
let isShuttingDown = false

export function configureStreamRegistry(persist: PersistMessagesSync): void {
  persistMessages = persist
  isShuttingDown = false
}

export function getActiveRegistry(): StreamRegistryRuntime | null {
  if (!persistMessages) return null
  return { streams, persistMessages, isShuttingDown }
}

export function requireRegistry(): StreamRegistryRuntime {
  const registry = getActiveRegistry()
  if (!registry) {
    throw new Error('Stream registry has not been initialized')
  }
  return registry
}

export function getStreams(): Map<string, ActiveStream> {
  return streams
}

export function getPersistMessages(): PersistMessagesSync | undefined {
  return persistMessages
}

export function isRegistryShuttingDown(): boolean {
  return isShuttingDown
}

export function markRegistryShuttingDown(): void {
  isShuttingDown = true
}

/** Remove a destroyed renderer from every subscriber set. */
export function purgeSender(sender: WebContents): void {
  for (const stream of streams.values()) {
    stream.subscribers.delete(sender)
  }
}

/** Test-only helper. */
export function _resetActiveStreamsForTests(): void {
  for (const stream of streams.values()) {
    if (stream.persistTimer) clearTimeout(stream.persistTimer)
  }
  streams.clear()
  isShuttingDown = false
}
