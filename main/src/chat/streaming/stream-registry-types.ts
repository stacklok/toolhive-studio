import type { WebContents } from 'electron'
import type { AsyncIterableStream, InferUIMessageChunk } from 'ai'
import type { ChatUIMessage } from '../types'
import type { ThreadMessage } from '../threads/types'

export type ChatUIMessageChunk = InferUIMessageChunk<ChatUIMessage>

type ProviderMetadata = Record<string, Record<string, unknown>>

/** Per-text-block replay state. The accumulated `text` is replayed as a
 * single consolidated `text-delta` so a late subscriber lands on the
 * exact same `runningMessage` without replaying every original delta. */
export interface TextPartReplay {
  text: string
  done: boolean
  providerMetadata?: ProviderMetadata
}

/** Per-reasoning-block replay state. Same shape as text. */
export interface ReasoningPartReplay {
  text: string
  done: boolean
  providerMetadata?: ProviderMetadata
}

/** Per-tool-block replay state. Tracks every metadata field the SDK
 * threads through `processUIMessageStream`, plus the tool's lifecycle
 * state so `buildReplayChunks` knows which output chunk to emit. */
export interface ToolPartReplay {
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
    | 'input-streaming'
    | 'input-available'
    | 'input-error'
    | 'output-available'
    | 'output-error'
}

export interface ActiveStream {
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

export type PersistMessagesSync = (
  chatId: string,
  messages: ThreadMessage[]
) => { success: boolean; error?: string }

/** Runtime-owned registry state (initialized by StreamRegistryService). */
export interface StreamRegistryRuntime {
  streams: Map<string, ActiveStream>
  persistMessages: PersistMessagesSync
  isShuttingDown: boolean
}

export interface RunStreamOptions {
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
