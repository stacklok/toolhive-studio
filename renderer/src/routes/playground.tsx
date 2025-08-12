import { createFileRoute } from '@tanstack/react-router'
import { ChatInterface } from '@/features/chat/components/chat-interface'
import { TitlePage } from '@/common/components/title-page'

export const Route = createFileRoute('/playground')({
  component: Playground,
})

export function Playground() {
  return (
    <div className="container mx-auto h-full p-6">
      <TitlePage title="Chat Playground">
        <p className="text-muted-foreground">
          Test and interact with AI models using your MCP servers
        </p>
      </TitlePage>
      <div className="mt-6 h-[calc(100vh-12rem)]">
        <ChatInterface />
      </div>
    </div>
  )
}
