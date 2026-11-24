import { infiniteQueryOptions } from '@tanstack/react-query'

const ARCHIVED_THREADS_PAGE_SIZE = 50

/** Archived threads, most recently archived first, paged by keyset cursor. */
export function archivedThreadsQueryOptions() {
  return infiniteQueryOptions({
    queryKey: ['chat', 'archived-threads'] as const,
    queryFn: ({ pageParam }) =>
      window.electronAPI.chat.listThreads({
        archived: true,
        limit: ARCHIVED_THREADS_PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: null as { ts: number; id: string } | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 0,
  })
}
