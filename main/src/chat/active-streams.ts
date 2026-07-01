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

type ProviderMetadata = Record<string, Record<string, unknown>>

/** Per-text-block replay state. The accumulated `text` is replayed as a
 * single consolidated `text-delta` so a late subscriber lands on the
 * exact same `runningMessage` without replaying every original delta. */
interface TextPartReplay {
  text: string
  done: boolean
  providerMetadata?: ProviderMetadata
}

/** Per-reasoning-block replay state. Same shape as text. */
interface ReasoningPartReplay {
  text: string
  done: boolean
  providerMetadata?: ProviderMetadata
}

/** Per-tool-block replay state. Tracks every metadata field the SDK
 * threads through `processUIMessageStream`, plus the tool's lifecycle
 * state so `buildReplayChunks` knows which output chunk to emit. */
interface ToolPartReplay {
  toolName: string
  dynamic: boolean | undefined
  providerExecuted: boolean | undefined
  title: string | undefined
  /** Accumulated raw input text (only meaningful while in
   * `input-streaming`); the SDK re-parses this internally. */
  partialInputText: string
  input: unknown
  rawInput: unknown
  output: unknown
  errorText: string | undefined
  preliminary: boolean | undefined
  callProviderMetadata?: ProviderMetadata
  resultProviderMetadata?: ProviderMetadata
  state:
    'input-streaming' | 'input-available' | 'output-available' | 'output-error'
}

interface ActiveStream {
  chatId: string
  streamId: string
  /** The message list provided when streaming started. The running
   * assistant message is appended/replaced when persisting snapshots. */
  originalMessages: ChatUIMessage[]
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
  /** Tripped on the first persist failure to broadcast a one-shot
   * `chat:stream:persist-error`. */
  persistFailed: boolean
  /** Captured from the `start` chunk; required to synthesize a replay. */
  messageId: string | undefined
  /** Ordered references to every block we've seen, replayed in order. */
  blockOrder: Array<
    | { kind: 'text'; id: string }
    | { kind: 'reasoning'; id: string }
    | { kind: 'tool'; toolCallId: string }
  >
  textParts: Map<string, TextPartReplay>
  reasoningParts: Map<string, ReasoningPartReplay>
  toolParts: Map<string, ToolPartReplay>
}

const streams = new Map<string, ActiveStream>()

/** True when the current process is shutting down. We avoid scheduling
 * timers/writes during shutdown to keep teardown deterministic. */
let isShuttingDown = false
try {
  // `on` (not `once`) so a cancelled-then-retried quit still flushes.
  app.on('before-quit', () => {
    isShuttingDown = true
    for (const stream of streams.values()) {
      flushPersist(stream)
      // Tear down the upstream so the provider stops billing tokens.
      try {
        stream.abortController.abort()
      } catch {
        // already aborted
      }
    }
  })
} catch {
  // `app` may be unavailable in unit-test contexts.
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

function reportPersistFailure(stream: ActiveStream, error: string) {
  if (stream.persistFailed) return
  stream.persistFailed = true
  broadcast(stream, 'chat:stream:persist-error', {
    streamId: stream.streamId,
    chatId: stream.chatId,
    error,
  })
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

function isPersistenceBoundary(chunk: ChatUIMessageChunk): boolean {
  return PERSISTENCE_BOUNDARIES.has(chunk.type)
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

/** Register a fresh stream in the global map. Throws if a stream for
 * this chat is already running — the caller surfaces the error. */
function buildActiveStream(options: RunStreamOptions): ActiveStream {
  const { chatId } = options
  if (streams.has(chatId)) {
    throw new Error(`Stream already active for chat ${chatId}`)
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
  streams.set(chatId, stream)
  attachInitialSender(
    stream,
    options.initialSender,
    options.initialToolUiMetadata
  )
  broadcastState(chatId, 'streaming')
  return stream
}

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

/**
 * Update the structural replay state from a single live chunk.
 *
 * The point of this state is to let `buildReplayChunks` synthesize a
 * minimal, deterministic chunk sequence that drops a late subscriber's
 * AI SDK assembler into the same `runningMessage` as the live tail —
 * without replaying every original delta. We only track what the AI
 * SDK's `processUIMessageStream` actually consumes to grow message
 * parts; ephemeral chunks (`start-step`, `finish-step`, metadata,
 * `finish`, `error`) are intentionally ignored — they'll arrive on the
 * live tail as the upstream produces them.
 */
function recordChunkForReplay(
  stream: ActiveStream,
  chunk: ChatUIMessageChunk
): void {
  switch (chunk.type) {
    case 'start': {
      if (chunk.messageId) stream.messageId = chunk.messageId
      return
    }
    case 'text-start': {
      if (!stream.textParts.has(chunk.id)) {
        stream.textParts.set(chunk.id, {
          text: '',
          done: false,
          providerMetadata: chunk.providerMetadata,
        })
        stream.blockOrder.push({ kind: 'text', id: chunk.id })
      }
      return
    }
    case 'text-delta': {
      const part = stream.textParts.get(chunk.id)
      if (part) part.text += chunk.delta
      return
    }
    case 'text-end': {
      const part = stream.textParts.get(chunk.id)
      if (part) {
        part.done = true
        if (chunk.providerMetadata)
          part.providerMetadata = chunk.providerMetadata
      }
      return
    }
    case 'reasoning-start': {
      if (!stream.reasoningParts.has(chunk.id)) {
        stream.reasoningParts.set(chunk.id, {
          text: '',
          done: false,
          providerMetadata: chunk.providerMetadata,
        })
        stream.blockOrder.push({ kind: 'reasoning', id: chunk.id })
      }
      return
    }
    case 'reasoning-delta': {
      const part = stream.reasoningParts.get(chunk.id)
      if (part) part.text += chunk.delta
      return
    }
    case 'reasoning-end': {
      const part = stream.reasoningParts.get(chunk.id)
      if (part) {
        part.done = true
        if (chunk.providerMetadata)
          part.providerMetadata = chunk.providerMetadata
      }
      return
    }
    case 'tool-input-start': {
      if (!stream.toolParts.has(chunk.toolCallId)) {
        stream.toolParts.set(chunk.toolCallId, {
          toolName: chunk.toolName,
          dynamic: chunk.dynamic,
          providerExecuted: chunk.providerExecuted,
          title: chunk.title,
          partialInputText: '',
          input: undefined,
          rawInput: undefined,
          output: undefined,
          errorText: undefined,
          preliminary: undefined,
          callProviderMetadata: chunk.providerMetadata,
          state: 'input-streaming',
        })
        stream.blockOrder.push({ kind: 'tool', toolCallId: chunk.toolCallId })
      }
      return
    }
    case 'tool-input-delta': {
      const part = stream.toolParts.get(chunk.toolCallId)
      if (part) part.partialInputText += chunk.inputTextDelta
      return
    }
    case 'tool-input-available': {
      const part = stream.toolParts.get(chunk.toolCallId)
      if (part) {
        part.toolName = chunk.toolName
        part.input = chunk.input
        part.dynamic = chunk.dynamic ?? part.dynamic
        part.providerExecuted = chunk.providerExecuted ?? part.providerExecuted
        part.title = chunk.title ?? part.title
        if (chunk.providerMetadata) {
          part.callProviderMetadata = chunk.providerMetadata
        }
        part.state = 'input-available'
      }
      return
    }
    case 'tool-input-error': {
      const part = stream.toolParts.get(chunk.toolCallId)
      if (part) {
        part.toolName = chunk.toolName
        part.rawInput = chunk.input
        part.errorText = chunk.errorText
        part.dynamic = chunk.dynamic ?? part.dynamic
        part.providerExecuted = chunk.providerExecuted ?? part.providerExecuted
        part.title = chunk.title ?? part.title
        if (chunk.providerMetadata) {
          part.callProviderMetadata = chunk.providerMetadata
        }
        part.state = 'output-error'
      }
      return
    }
    case 'tool-output-available': {
      const part = stream.toolParts.get(chunk.toolCallId)
      if (part) {
        part.output = chunk.output
        part.preliminary = chunk.preliminary
        part.providerExecuted = chunk.providerExecuted ?? part.providerExecuted
        if (chunk.providerMetadata) {
          part.resultProviderMetadata = chunk.providerMetadata
        }
        part.state = 'output-available'
      }
      return
    }
    case 'tool-output-error': {
      const part = stream.toolParts.get(chunk.toolCallId)
      if (part) {
        part.errorText = chunk.errorText
        part.providerExecuted = chunk.providerExecuted ?? part.providerExecuted
        if (chunk.providerMetadata) {
          part.resultProviderMetadata = chunk.providerMetadata
        }
        part.state = 'output-error'
      }
      return
    }
    default:
      // start-step / finish-step / message-metadata / finish / error /
      // tool-approval-request / tool-output-denied / data-* / file /
      // source-* — ignored for replay; live tail provides them.
      return
  }
}

function emitTextReplay(
  out: ChatUIMessageChunk[],
  id: string,
  part: TextPartReplay
): void {
  out.push({
    type: 'text-start',
    id,
    providerMetadata: part.providerMetadata,
  } as ChatUIMessageChunk)
  if (part.text.length > 0) {
    out.push({
      type: 'text-delta',
      id,
      delta: part.text,
    } as ChatUIMessageChunk)
  }
  if (part.done) {
    out.push({
      type: 'text-end',
      id,
      providerMetadata: part.providerMetadata,
    } as ChatUIMessageChunk)
  }
}

function emitReasoningReplay(
  out: ChatUIMessageChunk[],
  id: string,
  part: ReasoningPartReplay
): void {
  out.push({
    type: 'reasoning-start',
    id,
    providerMetadata: part.providerMetadata,
  } as ChatUIMessageChunk)
  if (part.text.length > 0) {
    out.push({
      type: 'reasoning-delta',
      id,
      delta: part.text,
    } as ChatUIMessageChunk)
  }
  if (part.done) {
    out.push({
      type: 'reasoning-end',
      id,
      providerMetadata: part.providerMetadata,
    } as ChatUIMessageChunk)
  }
}

function emitToolReplay(
  out: ChatUIMessageChunk[],
  toolCallId: string,
  part: ToolPartReplay
): void {
  out.push({
    type: 'tool-input-start',
    toolCallId,
    toolName: part.toolName,
    dynamic: part.dynamic,
    providerExecuted: part.providerExecuted,
    title: part.title,
    providerMetadata: part.callProviderMetadata,
  } as ChatUIMessageChunk)

  // Replay the partial input text only while the tool is still
  // streaming its arguments. After `tool-input-available` the SDK
  // ignores `partialToolCalls[id]` and reads `input` directly, so
  // there's no point shipping the deltas.
  if (part.state === 'input-streaming' && part.partialInputText.length > 0) {
    out.push({
      type: 'tool-input-delta',
      toolCallId,
      inputTextDelta: part.partialInputText,
    } as ChatUIMessageChunk)
  }

  if (part.state !== 'input-streaming') {
    if (part.input !== undefined) {
      out.push({
        type: 'tool-input-available',
        toolCallId,
        toolName: part.toolName,
        input: part.input,
        dynamic: part.dynamic,
        providerExecuted: part.providerExecuted,
        providerMetadata: part.callProviderMetadata,
        title: part.title,
      } as ChatUIMessageChunk)
    }
  }

  if (part.state === 'output-available') {
    out.push({
      type: 'tool-output-available',
      toolCallId,
      output: part.output,
      providerExecuted: part.providerExecuted,
      preliminary: part.preliminary,
      providerMetadata: part.resultProviderMetadata,
      dynamic: part.dynamic,
    } as ChatUIMessageChunk)
  } else if (part.state === 'output-error' && part.errorText !== undefined) {
    out.push({
      type: 'tool-output-error',
      toolCallId,
      errorText: part.errorText,
      providerExecuted: part.providerExecuted,
      providerMetadata: part.resultProviderMetadata,
      dynamic: part.dynamic,
    } as ChatUIMessageChunk)
  }
}

/**
 * Synthesize a replay chunk sequence that drops a late subscriber's
 * `processUIMessageStream` instance into the same `runningMessage` the
 * live tail is producing. We compress every original delta into one
 * consolidated delta per block, which is correct because the SDK only
 * cares that `activeTextParts[id]` exists when a delta lands — it
 * doesn't validate granularity.
 */
function buildReplayChunks(stream: ActiveStream): ChatUIMessageChunk[] {
  if (!stream.messageId) return []
  const out: ChatUIMessageChunk[] = [
    { type: 'start', messageId: stream.messageId } as ChatUIMessageChunk,
  ]
  for (const ref of stream.blockOrder) {
    if (ref.kind === 'text') {
      const part = stream.textParts.get(ref.id)
      if (part) emitTextReplay(out, ref.id, part)
    } else if (ref.kind === 'reasoning') {
      const part = stream.reasoningParts.get(ref.id)
      if (part) emitReasoningReplay(out, ref.id, part)
    } else {
      const part = stream.toolParts.get(ref.toolCallId)
      if (part) emitToolReplay(out, ref.toolCallId, part)
    }
  }
  return out
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
  streams.delete(stream.chatId)
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
export async function runManagedStream(
  options: RunStreamOptions
): Promise<void> {
  const stream = buildActiveStream(options)

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
  const stream = streams.get(chatId)
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
