import { createFileRoute } from '@tanstack/react-router'
import { ChatInterface } from '@/features/chat/components/chat-interface'
import { TitlePage } from '@/common/components/title-page'

export const Route = createFileRoute('/playground')({
  component: Playground,
})

function Playground() {
  return (
    <>
      <TitlePage title="Chat Playground">
        <p className="text-muted-foreground">
          Test and interact with AI models using your MCP servers
        </p>
      </TitlePage>
      <div className="h-[calc(100vh-10rem)] space-y-6">
        <ChatInterface />
      </div>
    </>
  )
}
