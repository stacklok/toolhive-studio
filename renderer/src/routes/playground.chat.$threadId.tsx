import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChatInterface } from '@/features/chat/components/chat-interface'
import { PlaygroundSidebar } from '@/features/chat/components/playground-sidebar'
import { usePlaygroundThreads } from '@/features/chat/hooks/use-playground-threads'
import { clearThreadDraft } from '@/features/chat/hooks/use-thread-draft'

export const Route = createFileRoute('/playground/chat/$threadId')({
  component: PlaygroundChat,
})

function PlaygroundChat() {
  const { threadId } = Route.useParams()
  const navigate = useNavigate()

  const {
    threads,
    isLoading,
    hasThreads,
    createThread,
    deleteThread,
    renameThread,
    toggleStarThread,
  } = usePlaygroundThreads(threadId)

  if (isLoading) {
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
          <div
            className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full"
          />
        </div>
      </div>
    )
  }

  const activeThread = threads.find((t) => t.id === threadId)

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
    const nextId = await deleteThread(id)
    clearThreadDraft(id)
    if (nextId) {
      void navigate({
        to: '/playground/chat/$threadId',
        params: { threadId: nextId },
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
          onSelectThread={handleSelectThread}
          onCreateThread={() => void handleCreateThread()}
          onDeleteThread={(id) => void handleDeleteThread(id)}
          onRenameThread={renameThread}
          onToggleStar={toggleStarThread}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ChatInterface
          threadId={hasThreads ? threadId : undefined}
          threadTitle={activeThread?.title}
          threadStarred={activeThread?.starred}
          onRenameThread={
            hasThreads ? (title) => renameThread(threadId, title) : undefined
          }
          onToggleStar={
            hasThreads ? () => toggleStarThread(threadId) : undefined
          }
          onDeleteThread={
            hasThreads ? () => void handleDeleteThread(threadId) : undefined
          }
        />
      </div>
    </div>
  )
}
