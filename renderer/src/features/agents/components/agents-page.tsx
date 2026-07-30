import { useMemo, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { Bot, Copy, Plus } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { trackEvent } from '@/common/lib/analytics'
import { useAgents, useDuplicateAgent } from '../hooks/use-agents'
import type { AgentConfig } from '@common/types/agents'

type AgentsTab = 'all' | 'builtin' | 'custom'

function isSpaceKey(e: KeyboardEvent) {
  return e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar'
}

function handleCardKeyDown(e: KeyboardEvent, onActivate: () => void) {
  if (e.repeat) return

  if (e.key === 'Enter') {
    e.preventDefault()
    onActivate()
    return
  }

  if (isSpaceKey(e)) {
    e.preventDefault()
  }
}

function handleCardKeyUp(e: KeyboardEvent, onActivate: () => void) {
  if (e.repeat) return

  if (isSpaceKey(e)) {
    e.preventDefault()
    onActivate()
  }
}

function getKindLabel(kind: AgentConfig['kind']) {
  return kind === 'builtin' ? 'Built-in' : 'Custom'
}

function formatModelLabel(model: NonNullable<AgentConfig['defaultModel']>) {
  return `${model.provider} · ${model.model}`
}

function AgentCard({
  agent,
  onOpen,
  onDuplicate,
}: {
  agent: AgentConfig
  onOpen: (agent: AgentConfig) => void
  onDuplicate: (agent: AgentConfig) => void
}) {
  const modelLabel = agent.defaultModel
    ? formatModelLabel(agent.defaultModel)
    : null

  return (
    <Card
      className="hover:border-accent-foreground/40 flex flex-col
        transition-colors"
      data-testid={`agent-card-${agent.id}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open ${agent.name}`}
        className="focus-visible:ring-ring flex min-w-0 flex-1 cursor-pointer
          flex-col rounded-t-md outline-none focus-visible:ring-2
          focus-visible:ring-offset-2"
        onClick={() => onOpen(agent)}
        onKeyDown={(e) => handleCardKeyDown(e, () => onOpen(agent))}
        onKeyUp={(e) => handleCardKeyUp(e, () => onOpen(agent))}
        data-testid={`open-agent-${agent.id}`}
      >
        <CardHeader className="pb-0">
          <div className="flex min-w-0 items-start gap-2">
            <Bot
              className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="min-h-10 text-base leading-snug">
                <Tooltip onlyWhenTruncated>
                  <TooltipTrigger asChild>
                    <span className="line-clamp-2 block text-left">
                      {agent.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {agent.name}
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3 pt-3">
          <div className="min-h-10">
            {agent.description ? (
              <CardDescription className="line-clamp-2">
                {agent.description}
              </CardDescription>
            ) : null}
          </div>

          <div
            className="flex min-h-5 min-w-0 items-center justify-between gap-2"
            data-testid={`agent-metadata-${agent.id}`}
          >
            <Badge
              variant={agent.kind === 'builtin' ? 'secondary' : 'outline'}
              className="shrink-0"
            >
              {getKindLabel(agent.kind)}
            </Badge>
            <div className="min-w-0 flex-1 text-right">
              {modelLabel ? (
                <p
                  className="text-muted-foreground flex min-w-0 items-center
                    justify-end gap-1.5 text-xs"
                >
                  <span className="shrink-0">Model</span>
                  <Tooltip onlyWhenTruncated>
                    <TooltipTrigger asChild>
                      <span className="truncate font-mono">{modelLabel}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {modelLabel}
                    </TooltipContent>
                  </Tooltip>
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </div>

      <CardFooter className="justify-end pt-0">
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
      const result = await duplicateAgent.mutateAsync(agent.id)
      trackEvent('Agents: duplicate', { source_agent_id: agent.id })
      if (!result.success || !result.agent) {
        toast.error(
          `Failed to duplicate agent: ${result.error ?? 'Unknown error'}`
        )
        return
      }
      toast.success(`Duplicated as "${result.agent.name}"`)
      void navigate({
        to: '/playground/agents/$agentId',
        params: { agentId: result.agent.id },
      })
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
            Create and manage the agents available in Playground.
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
