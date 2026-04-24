import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { AgentDetailPage } from '@/features/agents/components/agent-detail-page'
import { PlaygroundSidebar } from '@/features/chat/components/playground-sidebar'
import { useAgent } from '@/features/agents/hooks/use-agents'
import { usePlaygroundThreads } from '@/features/chat/hooks/use-playground-threads'
import { clearThreadDraft } from '@/features/chat/hooks/use-thread-draft'

export const Route = createFileRoute('/playground/agents_/$agentId')({
  component: PlaygroundAgentDetail,
})

function PlaygroundAgentDetail() {
  const { agentId } = Route.useParams()
  const navigate = useNavigate()
  const { data: agent, isLoading, isFetched } = useAgent(agentId)

  const {
    threads,
    hasThreads,
    createThread,
    deleteThread,
    renameThread,
    toggleStarThread,
  } = usePlaygroundThreads(null)

  useEffect(() => {
    if (isFetched && !agent) {
      toast.error('Agent not found')
      void navigate({ to: '/playground/agents', replace: true })
    }
  }, [agent, isFetched, navigate])

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
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-6">
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading agent…</div>
          ) : agent ? (
            <AgentDetailPage agent={agent} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
