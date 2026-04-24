import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { Bot, Copy, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/common/components/ui/tabs'
import { trackEvent } from '@/common/lib/analytics'
import { useAgents, useDuplicateAgent } from '../hooks/use-agents'
import type { AgentConfig } from '../../../../../main/src/chat/agents/types'

type AgentsTab = 'all' | 'builtin' | 'custom'

function AgentCard({
  agent,
  onOpen,
  onDuplicate,
}: {
  agent: AgentConfig
  onOpen: (agent: AgentConfig) => void
  onDuplicate: (agent: AgentConfig) => void
}) {
  const Icon = agent.kind === 'custom' ? Sparkles : Bot

  return (
    <Card
      className="hover:border-accent-foreground/40 flex cursor-pointer flex-col
        transition-colors"
      onClick={() => onOpen(agent)}
      data-testid={`agent-card-${agent.id}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <Icon className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <CardTitle className="truncate" title={agent.name}>
                {agent.name}
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {agent.description || 'No description'}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={agent.kind === 'builtin' ? 'secondary' : 'outline'}
            className="shrink-0 capitalize"
          >
            {agent.kind}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {agent.defaultModel && (
          <p className="text-muted-foreground text-xs">
            Default model:{' '}
            <span className="font-mono">
              {agent.defaultModel.provider} · {agent.defaultModel.model}
            </span>
          </p>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(agent)
          }}
          data-testid={`open-agent-${agent.id}`}
        >
          View details
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate(agent)
          }}
          data-testid={`duplicate-agent-${agent.id}`}
        >
          <Copy className="mr-2 h-3.5 w-3.5" />
          Duplicate
        </Button>
      </CardFooter>
    </Card>
  )
}

export function AgentsPage() {
  const navigate = useNavigate()
  const { data: agents = [], isLoading } = useAgents()
  const duplicateAgent = useDuplicateAgent()

  const [tab, setTab] = useState<AgentsTab>('all')

  const visibleAgents = useMemo(() => {
    if (tab === 'all') return agents
    return agents.filter((a) => a.kind === tab)
  }, [agents, tab])

  const openCreate = () => {
    void navigate({ to: '/playground/agents/new' })
  }

  const openDetail = (agent: AgentConfig) => {
    void navigate({
      to: '/playground/agents/$agentId',
      params: { agentId: agent.id },
    })
  }

  const handleDuplicate = async (agent: AgentConfig) => {
    try {
      const copy = await duplicateAgent.mutateAsync(agent.id)
      trackEvent('Agents: duplicate', { source_agent_id: agent.id })
      if (copy) {
        toast.success(`Duplicated as "${copy.name}"`)
        void navigate({
          to: '/playground/agents/$agentId',
          params: { agentId: copy.id },
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to duplicate agent: ${message}`)
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Agents</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure the personalities and instructions used by the Playground.
            Built-in agents can be duplicated and customised.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="create-agent">
          <Plus className="mr-2 h-4 w-4" />
          New agent
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as AgentsTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mb-4 self-start">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="builtin">Built-in</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading agents…</div>
          ) : visibleAgents.length === 0 ? (
            <div
              className="mx-auto flex max-w-md flex-col items-center
                justify-center py-16 text-center"
            >
              <Bot className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="text-lg font-semibold">No agents yet</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Create a custom agent or duplicate a built-in one to get
                started.
              </p>
              <Button onClick={openCreate} className="mt-6">
                <Plus className="mr-2 h-4 w-4" />
                New agent
              </Button>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              {visibleAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onOpen={openDetail}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
