import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChatInterface } from '@/features/chat/components/chat-interface'
import { PlaygroundSidebar } from '@/features/chat/components/playground-sidebar'
import { usePlaygroundThreads } from '@/features/chat/hooks/use-playground-threads'
import { useStreamingThreads } from '@/features/chat/hooks/use-streaming-threads'
import { clearThreadDraft } from '@/features/chat/hooks/use-thread-draft'
import { useArchiveThreadHandler } from '@/features/chat/hooks/use-archive-thread-handler'
import { chatThreadQueryOptions } from '@/features/chat/lib/thread-query'

function ChatLoadingDots() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex space-x-1">
        <div
          className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full
            [animation-delay:-0.3s]"
        />
        <div
          className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full
            [animation-delay:-0.15s]"
        />
        <div className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full" />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/playground/chat/$threadId')({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(chatThreadQueryOptions(params.threadId)),
  pendingComponent: ChatLoadingDots,
  component: PlaygroundChat,
})

function PlaygroundChat() {
  const { threadId } = Route.useParams()
  const navigate = useNavigate()

  const {
    threads,
    isLoading,
    hasThreads,
    hasMoreThreads,
    isLoadingMore,
    loadMoreThreads,
    createThread,
    deleteThread,
    archiveThread,
    unarchiveThread,
    renameThread,
    toggleStarThread,
  } = usePlaygroundThreads(threadId)
  const streamingThreadIds = useStreamingThreads()
  const handleArchiveThread = useArchiveThreadHandler({
    archiveThread,
    unarchiveThread,
    activeThreadId: threadId,
  })
  // Primed by the route loader. Archived threads aren't in the sidebar list,
  // so their title/star/archived state comes from here.
  const { data: threadData } = useQuery(chatThreadQueryOptions(threadId))
  const persistedThread = threadData?.thread ?? null
  const isArchived = !!persistedThread?.archivedAt

  if (isLoading) {
    return <ChatLoadingDots />
  }

  const activeThread = threads.find((t) => t.id === threadId)
  const showThread = hasThreads || isArchived

  const handleSelectThread = (id: string) => {
    void navigate({
      to: '/playground/chat/$threadId',
      params: { threadId: id },
    })
  }

  const handleCreateThread = async () => {
    const newId = await createThread()
    if (newId) {
      void navigate({
        to: '/playground/chat/$threadId',
        params: { threadId: newId },
      })
    }
  }

  const handleDeleteThread = async (id: string) => {
    const result = await deleteThread(id)
    if (!result.success) {
      // Delete failed — the thread (and its draft) still exists.
      return
    }
    clearThreadDraft(id)
    if (result.nextId) {
      void navigate({
        to: '/playground/chat/$threadId',
        params: { threadId: result.nextId },
      })
    } else {
      // No threads remain — go to index which will create a new one
      void navigate({ to: '/playground' })
    }
  }

  return (
    <div className="absolute inset-0 flex">
      {hasThreads && (
        <PlaygroundSidebar
          threads={threads}
          activeThreadId={threadId}
          streamingThreadIds={streamingThreadIds}
          onSelectThread={handleSelectThread}
          onCreateThread={() => void handleCreateThread()}
          onDeleteThread={(id) => void handleDeleteThread(id)}
          onRenameThread={renameThread}
          onToggleStar={toggleStarThread}
          onArchiveThread={(id) => void handleArchiveThread(id)}
          hasMoreThreads={hasMoreThreads}
          isLoadingMore={isLoadingMore}
          onLoadMoreThreads={() => void loadMoreThreads()}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ChatInterface
          threadId={showThread ? threadId : undefined}
          threadTitle={activeThread?.title ?? persistedThread?.title}
          threadStarred={activeThread?.starred ?? persistedThread?.starred}
          threadArchived={isArchived}
          // Archived chats are read-only until unarchived.
          onRenameThread={
            hasThreads && !isArchived
              ? (title) => renameThread(threadId, title)
              : undefined
          }
          onToggleStar={
            hasThreads && !isArchived
              ? () => toggleStarThread(threadId)
              : undefined
          }
          onDeleteThread={
            showThread ? () => void handleDeleteThread(threadId) : undefined
          }
          onArchiveThread={
            activeThread && !activeThread.pending
              ? () => void handleArchiveThread(threadId)
              : undefined
          }
          onUnarchiveThread={() =>
            void unarchiveThread(threadId).then((ok) => {
              if (!ok) toast.error('Failed to unarchive chat')
            })
          }
        />
      </div>
    </div>
  )
}
