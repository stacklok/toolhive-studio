import { createFileRoute } from '@tanstack/react-router'
import { ChatInterface } from '@/features/chat/components/chat-interface'
import { TitlePage } from '@/common/components/title-page'

export const Route = createFileRoute('/playground')({
  component: Playground,
})

function Playground() {
  return (
    <>
      <TitlePage title="Playground" />
      <div className="h-[calc(100vh-10rem)]">
        <ChatInterface />
      </div>
    </>
  )
}
