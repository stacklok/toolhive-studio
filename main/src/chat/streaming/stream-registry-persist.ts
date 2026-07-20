import { Cause, Effect } from 'effect'
import log from '../../logger'
import type { ChatUIMessage } from '../types'
import type { ThreadMessage } from '../threads/types'
import { getManagedRuntimeInstance } from '../runtime/runtime-ref'
import { broadcast } from './stream-registry-broadcast'
import {
  getActiveRegistry,
  getPersistMessages,
  isRegistryShuttingDown,
  markRegistryShuttingDown,
} from './stream-registry-state'
import type {
  ActiveStream,
  ChatUIMessageChunk,
  PersistMessagesSync,
} from './stream-registry-types'

/**
 * Throttled DB persistence cadence (ms).
 *
 * Snapshot writes during an active stream are debounced; in addition we
 * always flush on tool-call/finish boundaries and at stream finalize.
 */
const PERSIST_THROTTLE_MS = 250

/** Chunk types that force an immediate snapshot flush. */
const PERSISTENCE_BOUNDARIES: ReadonlySet<ChatUIMessageChunk['type']> = new Set(
  [
    'tool-input-start',
    'tool-input-available',
    'tool-output-available',
    'tool-output-error',
    'finish',
    'finish-step',
    'error',
  ]
)

export function isPersistenceBoundary(chunk: ChatUIMessageChunk): boolean {
  return PERSISTENCE_BOUNDARIES.has(chunk.type)
}

function buildSnapshot(stream: ActiveStream): ChatUIMessage[] {
  if (!stream.runningMessage) return stream.originalMessages
  const tail = stream.originalMessages[stream.originalMessages.length - 1]
  if (tail && tail.id === stream.runningMessage.id) {
    return [...stream.originalMessages.slice(0, -1), stream.runningMessage]
  }
  return [...stream.originalMessages, stream.runningMessage]
}

function reportPersistFailure(stream: ActiveStream, error: string): void {
  if (stream.persistFailed) return
  stream.persistFailed = true
  broadcast(stream, 'chat:stream:persist-error', {
    streamId: stream.streamId,
    chatId: stream.chatId,
    error,
  })
}

export function flushPersist(stream: ActiveStream): void {
  if (stream.persistTimer) {
    clearTimeout(stream.persistTimer)
    stream.persistTimer = null
  }
  if (!stream.pendingWrite) return
  stream.pendingWrite = false
  try {
    const persist = getPersistMessages()
    if (!persist) {
      reportPersistFailure(stream, 'Stream registry not initialized')
      return
    }
    const result = persist(stream.chatId, buildSnapshot(stream))
    if (!result.success) {
      log.warn(
        `[ACTIVE_STREAMS] Snapshot write failed for ${stream.chatId}: ${result.error}`
      )
      reportPersistFailure(stream, result.error ?? 'Unknown persist error')
    }
  } catch (error) {
    log.error(
      `[ACTIVE_STREAMS] Snapshot write threw for ${stream.chatId}:`,
      error
    )
    reportPersistFailure(
      stream,
      error instanceof Error ? error.message : 'Unknown persist error'
    )
  }
}

export function schedulePersist(stream: ActiveStream, force: boolean): void {
  if (isRegistryShuttingDown()) return
  stream.pendingWrite = true
  if (force) {
    flushPersist(stream)
    return
  }
  if (stream.persistTimer) return
  stream.persistTimer = setTimeout(() => {
    stream.persistTimer = null
    flushPersist(stream)
  }, PERSIST_THROTTLE_MS)
}

export function shutdownAllActiveStreams(): void {
  const registry = getActiveRegistry()
  if (!registry) return
  markRegistryShuttingDown()
  for (const stream of registry.streams.values()) {
    flushPersist(stream)
    try {
      stream.abortController.abort()
    } catch {
      // already aborted
    }
  }
}

export function makePersistMessages(
  updateThreadMessages: (
    chatId: string,
    messages: ThreadMessage[]
  ) => Effect.Effect<unknown, unknown, unknown>
): PersistMessagesSync {
  return (chatId, messages) => {
    // Use the raw instance (not health-gated getManagedRuntime) so shutdown
    // flush can persist while health is already `runtime_disposing`.
    const runtime = getManagedRuntimeInstance()
    if (!runtime) {
      return {
        success: false,
        error: 'Chat runtime is unavailable',
      }
    }
    const exit = runtime.runSyncExit(updateThreadMessages(chatId, messages))
    if (exit._tag === 'Success') {
      return { success: true }
    }
    const failure = Cause.failureOption(exit.cause)
    const errorMessage =
      failure._tag === 'Some'
        ? typeof failure.value === 'object' &&
          failure.value !== null &&
          'userMessage' in failure.value &&
          typeof (failure.value as { userMessage: unknown }).userMessage ===
            'string'
          ? (failure.value as { userMessage: string }).userMessage
          : failure.value instanceof Error
            ? failure.value.message
            : 'Failed to persist thread messages'
        : Cause.pretty(exit.cause) || 'Failed to persist thread messages'
    return {
      success: false,
      error: errorMessage,
    }
  }
}
