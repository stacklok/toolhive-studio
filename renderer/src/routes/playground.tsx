import { createFileRoute } from '@tanstack/react-router'
import { ChatInterface } from '@/features/chat/components/chat-interface'
import { PlaygroundSidebar } from '@/features/chat/components/playground-sidebar'
import { NotFound } from '@/common/components/not-found'
import { usePermissions } from '@/common/contexts/permissions'
import { PERMISSION_KEYS } from '@/common/contexts/permissions/permission-keys'
import { usePlaygroundThreads } from '@/features/chat/hooks/use-playground-threads'

export const Route = createFileRoute('/playground')({
  component: Playground,
})

function Playground() {
  const { canShow } = usePermissions()

  if (!canShow(PERMISSION_KEYS.PLAYGROUND_MENU)) {
    return <NotFound />
  }

  return <PlaygroundContent />
}

function PlaygroundContent() {
  const {
    threads,
    activeThreadId,
    isLoading,
    hasThreads,
    createThread,
    selectThread,
    deleteThread,
    renameThread,
    toggleStarThread,
  } = usePlaygroundThreads()

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

  if (!hasThreads) {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden">
        <ChatInterface />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex overflow-hidden">
      <PlaygroundSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={selectThread}
        onCreateThread={createThread}
        onDeleteThread={deleteThread}
        onRenameThread={renameThread}
        onToggleStar={toggleStarThread}
      />
      <div className="ml-sidebar flex min-w-0 flex-1 flex-col overflow-hidden">
        {(() => {
          const activeThread = threads.find((t) => t.id === activeThreadId)
          return (
            <ChatInterface
              threadId={activeThreadId}
              threadTitle={activeThread?.title}
              threadStarred={activeThread?.starred}
              onRenameThread={
                activeThreadId
                  ? (title) => renameThread(activeThreadId, title)
                  : undefined
              }
              onToggleStar={
                activeThreadId
                  ? () => toggleStarThread(activeThreadId)
                  : undefined
              }
              onDeleteThread={
                activeThreadId ? () => deleteThread(activeThreadId) : undefined
              }
            />
          )
        })()}
      </div>
    </div>
  )
}
