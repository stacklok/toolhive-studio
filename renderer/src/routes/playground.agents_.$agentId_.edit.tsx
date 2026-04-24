import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { AgentFormPage } from '@/features/agents/components/agent-form-page'
import { useAgent } from '@/features/agents/hooks/use-agents'

export const Route = createFileRoute('/playground/agents_/$agentId_/edit')({
  component: EditAgentRoute,
})

function EditAgentRoute() {
  const { agentId } = Route.useParams()
  const navigate = useNavigate()
  const { data: agent, isLoading, isFetched } = useAgent(agentId)

  useEffect(() => {
    if (!isFetched) return
    if (!agent) {
      toast.error('Agent not found')
      void navigate({ to: '/playground/agents', replace: true })
      return
    }
    if (agent.kind === 'builtin') {
      toast.error('Built-in agents cannot be edited. Duplicate it first.')
      void navigate({
        to: '/playground/agents/$agentId',
        params: { agentId: agent.id },
        replace: true,
      })
    }
  }, [agent, isFetched, navigate])

  return (
    <div className="absolute inset-0 flex overflow-y-auto">
      {isLoading ? (
        <div className="text-muted-foreground p-6 text-sm">Loading agent…</div>
      ) : agent && agent.kind !== 'builtin' ? (
        <AgentFormPage mode="edit" agent={agent} />
      ) : null}
    </div>
  )
}
