import { Effect } from 'effect'
import log from '../../logger'
import type { ChatUIMessage } from '../types'
import type { ThreadMessage } from '../threads/types'
import { operationResultFromExit, unavailableResult } from '../runtime/adapters'
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
import { isHollowAssistantMessage } from './sanitize-messages-for-model'

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

/** Exported for unit tests covering hollow-assistant persist rules. */
export function buildSnapshot(stream: ActiveStream): ChatUIMessage[] {
  let messages: ChatUIMessage[]
  if (!stream.runningMessage) {
    messages = stream.originalMessages
  } else if (isHollowAssistantMessage(stream.runningMessage)) {
    // Never persist a hollow assistant placeholder (stream start / abort
    // before any text, tools, or reasoning).
    messages = stream.originalMessages
  } else {
    const tail = stream.originalMessages[stream.originalMessages.length - 1]
    if (tail && tail.id === stream.runningMessage.id) {
      messages = [
        ...stream.originalMessages.slice(0, -1),
        stream.runningMessage,
      ]
    } else {
      messages = [...stream.originalMessages, stream.runningMessage]
    }
  }
  // Heal threads that already stored hollow assistants from earlier aborts.
  return messages.filter((message) => !isHollowAssistantMessage(message))
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
      return unavailableResult()
    }
    const exit = runtime.runSyncExit(
      updateThreadMessages(chatId, messages).pipe(Effect.as({}))
    )
    const result = operationResultFromExit(exit)
    return result.success
      ? { success: true }
      : { success: false, error: result.error }
  }
}
