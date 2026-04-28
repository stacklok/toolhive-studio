import { createFileRoute } from '@tanstack/react-router'
import { AgentFormPage } from '@/features/agents/components/agent-form-page'

export const Route = createFileRoute('/playground/agents_/new')({
  component: NewAgentRoute,
})

function NewAgentRoute() {
  return (
    <div className="absolute inset-0 flex overflow-y-auto">
      <AgentFormPage mode="create" />
    </div>
  )
}
