import { queryOptions } from '@tanstack/react-query'
import type { ChatUIMessage } from '../types'

/**
 * Query factory that loads a thread's messages and metadata in one shot.
 * Used by the `/playground/chat/$threadId` route loader so messages are
 * warm in the React Query cache before the component renders, and is
 * re-consumed by `useChatStreaming` via `useQuery` to hydrate the
 * `useChat` instance without a flash of loading UI.
 */
export function chatThreadQueryOptions(threadId: string | null | undefined) {
  return queryOptions({
    queryKey: ['chat', 'thread', threadId ?? null] as const,
    enabled: !!threadId,
    queryFn: async () => {
      if (!threadId) {
        return { thread: null, messages: [] as ChatUIMessage[] }
      }
      const [thread, messages] = await Promise.all([
        window.electronAPI.chat.getThread(threadId),
        window.electronAPI.chat.getThreadMessagesForTransport(threadId),
      ])
      return {
        thread,
        messages: (messages ?? []) as ChatUIMessage[],
      }
    },
    // Messages mutate during streaming via React Query cache invalidation
    // from `usePlaygroundThreads`; a 0 staleTime guarantees the loader sees
    // fresh data on revisit right after a completion signal fires.
    staleTime: 0,
  })
}
