import type { LanguageModelUsage } from 'ai'
import type { UIMessage } from 'ai'
import type { ChatUIMessage } from '../types'

export interface ChatSettingsThread {
  id: string
  title?: string
  /** When true, auto-title generation will never overwrite this title. */
  titleEditedByUser?: boolean
  starred?: boolean
  /** Epoch ms when the user archived the thread; null/absent = not archived. */
  archivedAt?: number | null
  messages: ChatUIMessage[]
  lastEditTimestamp: number
  createdAt: number
  /**
   * Id of the agent that should run for this thread. When absent, the
   * main process falls back to the default built-in agent.
   */
  agentId?: string | null
  /** Per-thread selected provider id (e.g. "openai"). NULL falls back to global. */
  selectedProvider?: string | null
  /** Per-thread selected model id. NULL falls back to global. */
  selectedModel?: string | null
  /** Per-thread enabled MCP tools, keyed by server name. NULL falls back to global. */
  enabledMcpTools?: Record<string, string[]> | null
  /** Per-thread enabled skill names. NULL falls back to global. */
  enabledSkills?: string[] | null
}

/**
 * Lightweight thread row for list views (sidebar, index redirect). Never
 * includes messages — hydrating every message of every thread is what made
 * the playground slow to open with a large history.
 */
export interface ThreadSummary {
  id: string
  title?: string
  starred: boolean
  lastEditTimestamp: number
  createdAt: number
  archivedAt: number | null
}

/**
 * Keyset cursor for paging thread lists. `ts` is the sort key of the last
 * row returned (`last_edit_timestamp`, or `archived_at` for the archived
 * list); `id` breaks ties. Stable when threads move to the top mid-paging,
 * unlike OFFSET.
 */
interface ThreadCursor {
  ts: number
  id: string
}

export interface ListThreadsOptions {
  /** true = archived threads only (ordered by archived_at); default false. */
  archived?: boolean
  /** Restrict to starred (true) or non-starred (false) threads. */
  starred?: boolean
  /** Page size. Omit to return every matching row. */
  limit?: number
  cursor?: ThreadCursor | null
}

export interface ThreadSearchResult extends ThreadSummary {
  /**
   * Excerpt of the matching message text with hits wrapped in
   * SEARCH_HIGHLIGHT_START / SEARCH_HIGHLIGHT_END (@common/chat/thread-search).
   * Null when only the title
   * matched.
   */
  snippet: string | null
}

export interface ThreadPage {
  threads: ThreadSummary[]
  /** Pass back as `cursor` to load the next page; null = no more rows. */
  nextCursor: ThreadCursor | null
}

export type ThreadMessage = UIMessage<{
  createdAt?: number
  model?: string
  providerId?: string
  totalUsage?: LanguageModelUsage
  responseTime?: number
  finishReason?: string
}>

export type ThreadUpdates = Partial<
  Omit<ChatSettingsThread, 'id' | 'createdAt'>
>
