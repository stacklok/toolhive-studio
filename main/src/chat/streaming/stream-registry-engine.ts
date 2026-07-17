import type { WebContents } from 'electron'
import { readUIMessageStream } from 'ai'
import log from '../../logger'
import type { ChatUIMessage } from '../types'
import { StreamConflictError } from '../runtime/errors'
import {
  broadcast,
  broadcastState,
  safeSend,
} from './stream-registry-broadcast'
import {
  flushPersist,
  isPersistenceBoundary,
  schedulePersist,
} from './stream-registry-persist'
import {
  buildReplayChunks,
  recordChunkForReplay,
} from './stream-registry-replay'
import { getStreams, requireRegistry } from './stream-registry-state'
import type {
  ActiveStream,
  ChatUIMessageChunk,
  RunStreamOptions,
} from './stream-registry-types'

function attachInitialSender(
  stream: ActiveStream,
  sender: WebContents | undefined,
  initialToolUiMetadata: Record<string, unknown> | undefined
): void {
  if (!sender || sender.isDestroyed()) return
  stream.subscribers.add(sender)
  if (initialToolUiMetadata) {
    safeSend(sender, 'chat:stream:tool-ui-metadata', initialToolUiMetadata)
  }
}

/** Register a fresh stream in the global map. Throws if a stream for
 * this chat is already running — the caller surfaces the error. */
export function buildActiveStream(options: RunStreamOptions): ActiveStream {
  const registry = requireRegistry()
  const { chatId } = options
  if (registry.streams.has(chatId)) {
    throw new StreamConflictError({
      chatId,
      userMessage: `Stream already active for chat ${chatId}`,
    })
  }
  const stream: ActiveStream = {
    chatId,
    streamId: options.streamId,
    originalMessages: options.originalMessages,
    subscribers: new Set(),
    runningMessage: undefined,
    persistTimer: null,
    pendingWrite: false,
    abortController: options.abortController,
    status: 'streaming',
    toolUiMetadata: options.initialToolUiMetadata ?? null,
    persistFailed: false,
    messageId: undefined,
    blockOrder: [],
    textParts: new Map(),
    reasoningParts: new Map(),
    toolParts: new Map(),
  }
  registry.streams.set(chatId, stream)
  attachInitialSender(
    stream,
    options.initialSender,
    options.initialToolUiMetadata
  )
  broadcastState(chatId, 'streaming')
  return stream
}

/** Drain the assembler branch in the background, keeping
 * `runningMessage` up to date for snapshot persistence. */
function startAssembler(
  stream: ActiveStream,
  branch: ReadableStream<ChatUIMessageChunk>
): Promise<void> {
  const assembler = readUIMessageStream<ChatUIMessage>({
    stream: branch,
    onError: (error) => {
      log.error(`[ACTIVE_STREAMS] Assembler error for ${stream.chatId}:`, error)
    },
  })
  return (async () => {
    for await (const message of assembler) {
      stream.runningMessage = message as ChatUIMessage
    }
  })().catch((error) => {
    log.error(
      `[ACTIVE_STREAMS] Assembler iteration failed for ${stream.chatId}:`,
      error
    )
  })
}

/** Drive the chunk branch: update per-block replay state, broadcast
 * each chunk to live subscribers, and schedule throttled persistence. */
async function pumpChunks(
  stream: ActiveStream,
  branch: ReadableStream<ChatUIMessageChunk>
): Promise<void> {
  for await (const chunk of branch as unknown as AsyncIterable<ChatUIMessageChunk>) {
    recordChunkForReplay(stream, chunk)
    broadcast(stream, 'chat:stream:chunk', {
      streamId: stream.streamId,
      chatId: stream.chatId,
      chunk,
    })
    schedulePersist(stream, isPersistenceBoundary(chunk))
  }
}

function finalizeSuccess(stream: ActiveStream): void {
  stream.status = 'finished'
  flushPersist(stream)
  broadcast(stream, 'chat:stream:end', {
    streamId: stream.streamId,
    chatId: stream.chatId,
  })
  broadcastState(stream.chatId, 'finished')
}

function finalizeError(stream: ActiveStream, error: unknown): void {
  stream.status = 'error'
  // Tear down the upstream even when the error came from above the
  // fetch (e.g. schema mismatch). AbortController is idempotent.
  try {
    stream.abortController.abort()
  } catch {
    // already aborted
  }
  flushPersist(stream)
  const message = error instanceof Error ? error.message : 'Unknown error'
  broadcast(stream, 'chat:stream:error', {
    streamId: stream.streamId,
    chatId: stream.chatId,
    error: message,
  })
  broadcastState(stream.chatId, 'error')
  log.error(`[ACTIVE_STREAMS] Stream ${stream.chatId} failed:`, error)
}

async function teardownStream(
  stream: ActiveStream,
  onComplete: (() => void | Promise<void>) | undefined
): Promise<void> {
  getStreams().delete(stream.chatId)
  if (!onComplete) return
  try {
    await onComplete()
  } catch (cleanupError) {
    log.error(
      `[ACTIVE_STREAMS] onComplete threw for ${stream.chatId}:`,
      cleanupError
    )
  }
}

/**
 * Drive a UI message stream through the active-streams registry. Chunks
 * are buffered, broadcast to all current subscribers, fed into a running
 * UIMessage assembler, and persisted to SQLite on a throttled cadence.
 *
 * Returns when the upstream completes or errors.
 */
export async function runManagedStreamPump(
  options: RunStreamOptions,
  stream: ActiveStream
): Promise<void> {
  // Tee the upstream: one branch broadcasts to subscribers, the other
  // feeds an assembler that yields running UIMessage snapshots.
  const [chunkBranch, assemblerBranch] = (
    options.uiMessageStream as ReadableStream<ChatUIMessageChunk>
  ).tee()
  const assemblerTask = startAssembler(stream, assemblerBranch)

  try {
    await pumpChunks(stream, chunkBranch)
    await assemblerTask
    finalizeSuccess(stream)
  } catch (error) {
    finalizeError(stream, error)
  } finally {
    await teardownStream(stream, options.onComplete)
  }
}

/** Subscribe a renderer to an active stream. Returns synthesized
 * replay chunks generated from the stream's per-block structural state
 * — enough to drop the renderer's AI SDK assembler into the same
 * `runningMessage` that the live tail is producing. */
export function subscribeToStream(
  chatId: string,
  sender: WebContents
): {
  streamId: string
  replayChunks: ChatUIMessageChunk[]
  toolUiMetadata: Record<string, unknown> | null
} | null {
  const stream = getStreams().get(chatId)
  if (!stream || stream.status !== 'streaming') return null
  if (sender.isDestroyed()) return null
  stream.subscribers.add(sender)
  return {
    streamId: stream.streamId,
    replayChunks: buildReplayChunks(stream),
    toolUiMetadata: stream.toolUiMetadata,
  }
}

/** Detach a renderer without affecting the upstream — the LLM call keeps
 * running so the user can return to the thread later. */
export function unsubscribeFromStream(
  chatId: string,
  sender: WebContents
): void {
  const stream = getStreams().get(chatId)
  if (!stream) return
  stream.subscribers.delete(sender)
}

/** Cancel the in-flight LLM call for `chatId` (if any). The active
 * stream's iterator will throw, triggering the standard error path. */
export function cancelStream(chatId: string): boolean {
  const stream = getStreams().get(chatId)
  if (!stream) return false
  try {
    stream.abortController.abort()
  } catch (error) {
    log.warn(`[ACTIVE_STREAMS] Failed to abort stream for ${chatId}:`, error)
  }
  return true
}

export function getActiveStreamId(chatId: string): string | null {
  const stream = getStreams().get(chatId)
  return stream?.status === 'streaming' ? stream.streamId : null
}

/** Returns the set of chat IDs currently streaming. Used by the
 * renderer on mount to seed sidebar indicators when streams started
 * before this renderer subscribed. */
export function getStreamingChatIds(): string[] {
  const ids: string[] = []
  for (const [chatId, stream] of getStreams().entries()) {
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
  const stream = getStreams().get(chatId)
  if (!stream) return
  stream.toolUiMetadata = metadata
  broadcast(stream, 'chat:stream:tool-ui-metadata', metadata)
}
