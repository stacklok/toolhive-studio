import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AgentsPage } from '@/features/agents/components/agents-page'
import { PlaygroundSidebar } from '@/features/chat/components/playground-sidebar'
import { usePlaygroundThreads } from '@/features/chat/hooks/use-playground-threads'
import { clearThreadDraft } from '@/features/chat/hooks/use-thread-draft'

export const Route = createFileRoute('/playground/agents')({
  component: PlaygroundAgents,
})

function PlaygroundAgents() {
  const navigate = useNavigate()

  const {
    threads,
    hasThreads,
    createThread,
    deleteThread,
    renameThread,
    toggleStarThread,
  } = usePlaygroundThreads(null)

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
          onSelectThread={handleSelectThread}
          onCreateThread={() => void handleCreateThread()}
          onDeleteThread={(id) => void handleDeleteThread(id)}
          onRenameThread={renameThread}
          onToggleStar={toggleStarThread}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AgentsPage />
      </div>
    </div>
  )
}
