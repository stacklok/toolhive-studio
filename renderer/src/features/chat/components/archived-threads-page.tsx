import type { ReactElement } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Archive, ArchiveRestore, Loader2, Star, Trash2 } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { useConfirm } from '@/common/hooks/use-confirm'
import { archivedThreadsQueryOptions } from '../lib/archived-threads-query'
import { formatRelativeTime } from '../lib/format-relative-time'

interface ArchivedThreadsPageProps {
  onOpenThread: (threadId: string) => void
  onUnarchiveThread: (threadId: string) => void
  onDeleteThread: (threadId: string) => void
}

export function ArchivedThreadsPage({
  onOpenThread,
  onUnarchiveThread,
  onDeleteThread,
}: ArchivedThreadsPageProps): ReactElement {
  const confirm = useConfirm()
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery(archivedThreadsQueryOptions())
  const threads = data?.pages.flatMap((p) => p.threads) ?? []

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Archived chats</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Archived chats are hidden from the sidebar. Open one to read it, or
          unarchive it to bring it back.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : threads.length === 0 ? (
          <div
            className="mx-auto flex max-w-md flex-col items-center
              justify-center py-16 text-center"
          >
            <Archive className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">No archived chats</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Archive a chat from its menu in the sidebar to tidy up your list
              without deleting it.
            </p>
          </div>
        ) : (
          <ul className="divide-border divide-y rounded-md border">
            {threads.map((thread) => {
              const label = thread.title ?? 'New chat'
              return (
                <li
                  key={thread.id}
                  className="hover:bg-accent/60 flex items-center gap-3 px-4
                    py-3"
                >
                  <button
                    type="button"
                    onClick={() => onOpenThread(thread.id)}
                    className="flex min-w-0 flex-1 flex-col items-start
                      text-left"
                  >
                    <span className="flex max-w-full items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {label}
                      </span>
                      {thread.starred && (
                        <Star
                          className="text-muted-foreground h-3 w-3 shrink-0
                            fill-current"
                          aria-label="Starred"
                        />
                      )}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Archived{' '}
                      {thread.archivedAt
                        ? formatRelativeTime(thread.archivedAt)
                        : ''}
                    </span>
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUnarchiveThread(thread.id)}
                    aria-label={`Unarchive ${label}`}
                  >
                    <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
                    Unarchive
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8
                      w-8"
                    aria-label={`Delete ${label}`}
                    onClick={async () => {
                      const ok = await confirm(
                        `Delete "${label}"? This cannot be undone.`,
                        {
                          title: 'Delete thread',
                          isDestructive: true,
                          buttons: { yes: 'Delete', no: 'Cancel' },
                        }
                      )
                      if (ok) onDeleteThread(thread.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        {hasNextPage && (
          <div className="flex justify-center py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Show more
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
