import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bot, Check, ChevronDown, Settings2, Sparkles } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
import { trackEvent } from '@/common/lib/analytics'
import {
  useAgents,
  useSetThreadAgent,
  useThreadAgentId,
} from '../../agents/hooks/use-agents'
import { DEFAULT_AGENT_ID } from '../../../../../main/src/chat/agents/types'
import type { AgentConfig } from '../../../../../main/src/chat/agents/types'

interface AgentSelectorProps {
  threadId?: string | null
}

function getAgentIcon(agent: AgentConfig | undefined) {
  if (!agent) return <Bot className="h-4 w-4" />
  if (agent.kind === 'custom') return <Sparkles className="h-4 w-4" />
  return <Bot className="h-4 w-4" />
}

export function AgentSelector({ threadId }: AgentSelectorProps) {
  const navigate = useNavigate()
  const { data: agents = [], isLoading } = useAgents()
  const { data: threadAgentId } = useThreadAgentId(threadId ?? undefined)
  const setThreadAgent = useSetThreadAgent()

  const selectedAgentId = threadAgentId || DEFAULT_AGENT_ID
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId]
  )

  const builtinAgents = useMemo(
    () => agents.filter((a) => a.kind === 'builtin'),
    [agents]
  )
  const customAgents = useMemo(
    () => agents.filter((a) => a.kind === 'custom'),
    [agents]
  )

  const handleSelect = (agentId: string) => {
    if (!threadId) return
    if (agentId === selectedAgentId) return
    trackEvent(`Playground: select agent ${agentId}`)
    setThreadAgent.mutate({ threadId, agentId })
  }

  const handleManage = () => {
    trackEvent('Playground: open agents page')
    navigate({ to: '/playground/agents' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 justify-between gap-1 px-2 has-[>svg]:px-2"
          disabled={isLoading || !threadId}
          data-testid="agent-selector"
          title={selectedAgent?.description ?? 'Select an agent'}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {getAgentIcon(selectedAgent)}
            <span className="max-w-32 truncate text-sm">
              {selectedAgent?.name ?? 'Agent'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Agents
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Built-in
        </DropdownMenuLabel>
        {builtinAgents.map((agent) => {
          const isSelected = agent.id === selectedAgentId
          return (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => handleSelect(agent.id)}
              className="flex cursor-pointer items-start gap-2"
            >
              <div className="mt-0.5 h-4 w-4 shrink-0">
                {isSelected && <Check className="h-4 w-4" />}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {agent.name}
                </span>
                {agent.description && (
                  <span className="text-muted-foreground line-clamp-2 text-xs">
                    {agent.description}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          )
        })}

        {customAgents.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Custom
            </DropdownMenuLabel>
            {customAgents.map((agent) => {
              const isSelected = agent.id === selectedAgentId
              return (
                <DropdownMenuItem
                  key={agent.id}
                  onClick={() => handleSelect(agent.id)}
                  className="flex cursor-pointer items-start gap-2"
                >
                  <div className="mt-0.5 h-4 w-4 shrink-0">
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {agent.name}
                    </span>
                    {agent.description && (
                      <span
                        className="text-muted-foreground line-clamp-2 text-xs"
                      >
                        {agent.description}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              )
            })}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleManage} className="cursor-pointer">
          <Settings2 className="mr-2 h-4 w-4" />
          Manage agents
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
