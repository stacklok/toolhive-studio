import { app, webContents as webContentsApi } from 'electron'
import type { WebContents } from 'electron'
import type { AsyncIterableStream, InferUIMessageChunk } from 'ai'
import { readUIMessageStream } from 'ai'
import log from '../logger'
import type { ChatUIMessage } from './types'
import { updateThreadMessages } from './threads-storage'

/**
 * Throttled DB persistence cadence (ms).
 *
 * Snapshot writes during an active stream are debounced; in addition we
 * always flush on tool-call/finish boundaries and at stream finalize.
 */
const PERSIST_THROTTLE_MS = 250

type ChatUIMessageChunk = InferUIMessageChunk<ChatUIMessage>

interface ActiveStream {
  chatId: string
  streamId: string
  /** The message list provided when streaming started. The running
   * assistant message is appended/replaced when persisting snapshots. */
  originalMessages: ChatUIMessage[]
  /** Replay buffer for late subscribers. */
  bufferedChunks: ChatUIMessageChunk[]
  subscribers: Set<WebContents>
  /** Latest UIMessage snapshot produced by the assembler — undefined until
   * the AI SDK has produced its first message. */
  runningMessage: ChatUIMessage | undefined
  /** Pending throttled DB write timer. */
  persistTimer: NodeJS.Timeout | null
  /** Whether the latest snapshot has been written to disk. */
  pendingWrite: boolean
  /** AbortController used to cancel the upstream LLM call. */
  abortController: AbortController
  status: 'streaming' | 'finished' | 'error'
  /** Last UI metadata payload broadcast on the stream — replayed to late
   * subscribers so they can identify MCP App tools. */
  toolUiMetadata: Record<string, unknown> | null
}

const streams = new Map<string, ActiveStream>()

/** True when the current process is shutting down. We avoid scheduling
 * timers/writes during shutdown to keep teardown deterministic. */
let isShuttingDown = false
try {
  app.once('before-quit', () => {
    isShuttingDown = true
    for (const stream of streams.values()) {
      flushPersist(stream)
    }
  })
} catch {
  // `app` may be unavailable in unit-test contexts; that's fine.
}

function safeSend(
  sender: WebContents,
  channel: string,
  payload: unknown
): boolean {
  try {
    if (sender.isDestroyed()) return false
    sender.send(channel, payload)
    return true
  } catch (error) {
    log.warn('[ACTIVE_STREAMS] Failed to send IPC payload:', error)
    return false
  }
}

/** Broadcast a stream-state change to every renderer window so UI
 * surfaces (e.g. the sidebar) can reflect activity for threads they
 * aren't currently subscribed to. */
function broadcastState(
  chatId: string,
  status: 'streaming' | 'finished' | 'error'
) {
  let allContents: WebContents[]
  try {
    allContents = webContentsApi.getAllWebContents()
  } catch {
    return
  }
  for (const wc of allContents) {
    safeSend(wc, 'chat:stream:state', { chatId, status })
  }
}

function broadcast(stream: ActiveStream, channel: string, payload: unknown) {
  for (const sender of stream.subscribers) {
    if (!safeSend(sender, channel, payload)) {
      stream.subscribers.delete(sender)
    }
  }
}

function buildSnapshot(stream: ActiveStream): ChatUIMessage[] {
  if (!stream.runningMessage) return stream.originalMessages
  const tail = stream.originalMessages[stream.originalMessages.length - 1]
  if (tail && tail.id === stream.runningMessage.id) {
    return [...stream.originalMessages.slice(0, -1), stream.runningMessage]
  }
  return [...stream.originalMessages, stream.runningMessage]
}

function flushPersist(stream: ActiveStream) {
  if (stream.persistTimer) {
    clearTimeout(stream.persistTimer)
    stream.persistTimer = null
  }
  if (!stream.pendingWrite) return
  stream.pendingWrite = false
  try {
    const result = updateThreadMessages(stream.chatId, buildSnapshot(stream))
    if (!result.success) {
      log.warn(
        `[ACTIVE_STREAMS] Snapshot write failed for ${stream.chatId}: ${result.error}`
      )
    }
  } catch (error) {
    log.error(
      `[ACTIVE_STREAMS] Snapshot write threw for ${stream.chatId}:`,
      error
    )
  }
}

function schedulePersist(stream: ActiveStream, force: boolean) {
  if (isShuttingDown) return
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

function isPersistenceBoundary(chunk: ChatUIMessageChunk): boolean {
  switch (chunk.type) {
    case 'tool-input-start':
    case 'tool-input-available':
    case 'tool-output-available':
    case 'tool-output-error':
    case 'finish':
    case 'finish-step':
    case 'error':
      return true
    default:
      return false
  }
}

interface RunStreamOptions {
  chatId: string
  streamId: string
  originalMessages: ChatUIMessage[]
  uiMessageStream: AsyncIterableStream<ChatUIMessageChunk>
  abortController: AbortController
  initialSender?: WebContents
  /** Tool UI metadata broadcast on first chunk so late-attaching
   * subscribers can identify MCP App tools. */
  initialToolUiMetadata?: Record<string, unknown>
  onComplete?: () => void | Promise<void>
}

/**
 * Drive a UI message stream through the active-streams registry. Chunks
 * are buffered, broadcast to all current subscribers, fed into a running
 * UIMessage assembler, and persisted to SQLite on a throttled cadence.
 *
 * Returns when the upstream completes or errors.
 */
export async function runManagedStream(
  options: RunStreamOptions
): Promise<void> {
  const {
    chatId,
    streamId,
    originalMessages,
    uiMessageStream,
    abortController,
    initialSender,
    initialToolUiMetadata,
    onComplete,
  } = options

  const stream: ActiveStream = {
    chatId,
    streamId,
    originalMessages,
    bufferedChunks: [],
    subscribers: new Set(),
    runningMessage: undefined,
    persistTimer: null,
    pendingWrite: false,
    abortController,
    status: 'streaming',
    toolUiMetadata: initialToolUiMetadata ?? null,
  }
  streams.set(chatId, stream)
  if (initialSender && !initialSender.isDestroyed()) {
    stream.subscribers.add(initialSender)
    if (initialToolUiMetadata) {
      safeSend(
        initialSender,
        'chat:stream:tool-ui-metadata',
        initialToolUiMetadata
      )
    }
  }
  broadcastState(chatId, 'streaming')

  // Tee the upstream so one branch drives IPC + buffer and the other
  // feeds an assembler that yields running UIMessage snapshots.
  const [chunkBranch, assemblerBranch] = (
    uiMessageStream as ReadableStream<ChatUIMessageChunk>
  ).tee()

  const assembler = readUIMessageStream<ChatUIMessage>({
    stream: assemblerBranch,
    onError: (error) => {
      log.error(`[ACTIVE_STREAMS] Assembler error for ${chatId}:`, error)
    },
  })

  const assemblerTask = (async () => {
    for await (const message of assembler) {
      stream.runningMessage = message as ChatUIMessage
    }
  })().catch((error) => {
    log.error(
      `[ACTIVE_STREAMS] Assembler iteration failed for ${chatId}:`,
      error
    )
  })

  try {
    for await (const chunk of chunkBranch as unknown as AsyncIterable<ChatUIMessageChunk>) {
      // Buffer is bounded by stream lifetime — released in `finally`
      // below. Swap to snapshot + tail-buffer if streams ever go huge.
      stream.bufferedChunks.push(chunk)
      broadcast(stream, 'chat:stream:chunk', { streamId, chatId, chunk })
      schedulePersist(stream, isPersistenceBoundary(chunk))
    }

    await assemblerTask
    stream.status = 'finished'
    flushPersist(stream)
    broadcast(stream, 'chat:stream:end', { streamId, chatId })
    broadcastState(chatId, 'finished')
  } catch (error) {
    stream.status = 'error'
    flushPersist(stream)
    const message = error instanceof Error ? error.message : 'Unknown error'
    broadcast(stream, 'chat:stream:error', {
      streamId,
      chatId,
      error: message,
    })
    broadcastState(chatId, 'error')
    log.error(`[ACTIVE_STREAMS] Stream ${chatId} failed:`, error)
  } finally {
    streams.delete(chatId)
    if (onComplete) {
      try {
        await onComplete()
      } catch (cleanupError) {
        log.error(
          `[ACTIVE_STREAMS] onComplete threw for ${chatId}:`,
          cleanupError
        )
      }
    }
  }
}

/** Subscribe a renderer to an active stream. Returns the buffered
 * backlog so it can replay missed chunks before listening for new ones. */
export function subscribeToStream(
  chatId: string,
  sender: WebContents
): {
  streamId: string
  bufferedChunks: ChatUIMessageChunk[]
  toolUiMetadata: Record<string, unknown> | null
} | null {
  const stream = streams.get(chatId)
  if (!stream || stream.status !== 'streaming') return null
  if (sender.isDestroyed()) return null
  stream.subscribers.add(sender)
  return {
    streamId: stream.streamId,
    bufferedChunks: [...stream.bufferedChunks],
    toolUiMetadata: stream.toolUiMetadata,
  }
}

/** Detach a renderer without affecting the upstream — the LLM call keeps
 * running so the user can return to the thread later. */
export function unsubscribeFromStream(
  chatId: string,
  sender: WebContents
): void {
  const stream = streams.get(chatId)
  if (!stream) return
  stream.subscribers.delete(sender)
}

/** Cancel the in-flight LLM call for `chatId` (if any). The active
 * stream's iterator will throw, triggering the standard error path. */
export function cancelStream(chatId: string): boolean {
  const stream = streams.get(chatId)
  if (!stream) return false
  try {
    stream.abortController.abort()
  } catch (error) {
    log.warn(`[ACTIVE_STREAMS] Failed to abort stream for ${chatId}:`, error)
  }
  return true
}

export function getActiveStreamId(chatId: string): string | null {
  const stream = streams.get(chatId)
  return stream?.status === 'streaming' ? stream.streamId : null
}

/** Returns the set of chat IDs currently streaming. Used by the
 * renderer on mount to seed sidebar indicators when streams started
 * before this renderer subscribed. */
export function getStreamingChatIds(): string[] {
  const ids: string[] = []
  for (const [chatId, stream] of streams.entries()) {
    if (stream.status === 'streaming') ids.push(chatId)
  }
  return ids
}

/** Cache the latest tool UI metadata for a stream so late subscribers
 * receive it without an extra round-trip. */
export function setToolUiMetadata(
  chatId: string,
  metadata: Record<string, unknown>
): void {
  const stream = streams.get(chatId)
  if (!stream) return
  stream.toolUiMetadata = metadata
  broadcast(stream, 'chat:stream:tool-ui-metadata', metadata)
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
}
