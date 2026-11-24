import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArchivedThreadsPage } from '@/features/chat/components/archived-threads-page'
import { PlaygroundSidebar } from '@/features/chat/components/playground-sidebar'
import { usePlaygroundThreads } from '@/features/chat/hooks/use-playground-threads'
import { useStreamingThreads } from '@/features/chat/hooks/use-streaming-threads'
import { clearThreadDraft } from '@/features/chat/hooks/use-thread-draft'
import { useArchiveThreadHandler } from '@/features/chat/hooks/use-archive-thread-handler'

export const Route = createFileRoute('/playground/archived')({
  component: PlaygroundArchived,
})

function PlaygroundArchived() {
  const navigate = useNavigate()

  const {
    threads,
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

  const openThread = (id: string) => {
    void navigate({
      to: '/playground/chat/$threadId',
      params: { threadId: id },
    })
  }

  const handleCreateThread = async () => {
    const newId = await createThread()
    if (newId) openThread(newId)
  }

  const handleDeleteThread = async (id: string) => {
    const result = await deleteThread(id)
    if (!result.success) {
      toast.error('Failed to delete chat')
      return
    }
    clearThreadDraft(id)
  }

  const handleUnarchiveThread = async (id: string) => {
    const ok = await unarchiveThread(id)
    if (!ok) toast.error('Failed to unarchive chat')
  }

  return (
    <div className="absolute inset-0 flex">
      {/* Always shown, even with every chat archived: it holds New chat and
          the way back out of this page. */}
      <PlaygroundSidebar
        threads={threads}
        activeThreadId={null}
        streamingThreadIds={streamingThreadIds}
        onSelectThread={openThread}
        onCreateThread={() => void handleCreateThread()}
        onDeleteThread={(id) => void handleDeleteThread(id)}
        onRenameThread={renameThread}
        onToggleStar={toggleStarThread}
        onArchiveThread={(id) => void handleArchiveThread(id)}
        hasMoreThreads={hasMoreThreads}
        isLoadingMore={isLoadingMore}
        onLoadMoreThreads={() => void loadMoreThreads()}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ArchivedThreadsPage
          onOpenThread={openThread}
          onUnarchiveThread={(id) => void handleUnarchiveThread(id)}
          onDeleteThread={(id) => void handleDeleteThread(id)}
        />
      </div>
    </div>
  )
}
