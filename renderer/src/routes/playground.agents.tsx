import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AgentsPage } from '@/features/agents/components/agents-page'
import { PlaygroundSidebar } from '@/features/chat/components/playground-sidebar'
import { usePlaygroundThreads } from '@/features/chat/hooks/use-playground-threads'
import { useStreamingThreads } from '@/features/chat/hooks/use-streaming-threads'
import { clearThreadDraft } from '@/features/chat/hooks/use-thread-draft'
import { useArchiveThreadHandler } from '@/features/chat/hooks/use-archive-thread-handler'

export const Route = createFileRoute('/playground/agents')({
  component: PlaygroundAgents,
})

function PlaygroundAgents() {
  const navigate = useNavigate()

  const {
    threads,
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
  } = usePlaygroundThreads(null)
  const streamingThreadIds = useStreamingThreads()
  const handleArchiveThread = useArchiveThreadHandler({
    archiveThread,
    unarchiveThread,
    activeThreadId: null,
  })

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
    if (!result.success) return
    clearThreadDraft(id)
    if (result.nextId) {
      void navigate({
        to: '/playground/chat/$threadId',
        params: { threadId: result.nextId },
      })
    }
  }

  return (
    <div className="absolute inset-0 flex">
      {hasThreads && (
        <PlaygroundSidebar
          threads={threads}
          activeThreadId={null}
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
        <AgentsPage />
      </div>
    </div>
  )
}
