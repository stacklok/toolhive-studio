import { createFileRoute } from '@tanstack/react-router'
import { ChatInterface } from '@/features/chat/components/chat-interface'

export const Route = createFileRoute('/playground')({
  component: Playground,
})

function Playground() {
  return <ChatInterface />
}
