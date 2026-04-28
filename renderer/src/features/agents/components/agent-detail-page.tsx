import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { cjk } from '@streamdown/cjk'
import { Bot, Copy, Pencil, Sparkles, Trash2, Wrench } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import { useConfirm } from '@/common/hooks/use-confirm'
import { STREAMDOWN_PROSE_CLASS } from '@/common/lib/streamdown-prose'
import { trackEvent } from '@/common/lib/analytics'
import { SkillDetailLayout } from '@/features/skills/components/skill-detail-layout'
import { useDeleteAgent, useDuplicateAgent } from '../hooks/use-agents'
import type { AgentConfig } from '../../../../../main/src/chat/agents/types'

const STREAMDOWN_PLUGINS = { code, mermaid, cjk }

function AgentInfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-muted-foreground text-xs font-semibold tracking-wider
          uppercase"
      >
        {label}
      </span>
      <span className="text-foreground text-sm wrap-break-word">{value}</span>
    </div>
  )
}

export function AgentDetailPage({ agent }: { agent: AgentConfig }) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const deleteAgent = useDeleteAgent()
  const duplicateAgent = useDuplicateAgent()

  const isBuiltin = agent.kind === 'builtin'
  const Icon = isBuiltin ? Bot : Sparkles

  const handleDuplicate = async () => {
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

  const handleDelete = async () => {
    const ok = await confirm(
      `Delete "${agent.name}"? Any chats using it will fall back to the default agent.`,
      {
        title: 'Delete agent',
        isDestructive: true,
        buttons: { yes: 'Delete', no: 'Cancel' },
      }
    )
    if (!ok) return
    try {
      const result = await deleteAgent.mutateAsync(agent.id)
      trackEvent('Agents: delete', { agent_id: agent.id })
      if (result.success) {
        toast.success(`Deleted "${agent.name}"`)
        void navigate({ to: '/playground/agents' })
      } else {
        toast.error(result.error ?? 'Failed to delete agent')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to delete agent: ${message}`)
    }
  }

  return (
    <SkillDetailLayout
      title={agent.name}
      backTo="/playground/agents"
      historyBack={false}
      badges={
        <>
          <Badge
            variant={isBuiltin ? 'secondary' : 'outline'}
            className="capitalize"
          >
            <Icon className="mr-1 h-3 w-3" />
            {agent.kind}
          </Badge>
          {agent.builtinToolsKey && (
            <Badge variant="outline">
              <Wrench className="mr-1 h-3 w-3" />
              {agent.builtinToolsKey} tools
            </Badge>
          )}
        </>
      }
      description={agent.description || undefined}
      actions={
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="action"
              onClick={handleDuplicate}
              data-testid={`duplicate-agent-${agent.id}`}
            >
              <Copy className="mr-1 h-4 w-4" />
              Duplicate
            </Button>
            {!isBuiltin && (
              <>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    void navigate({
                      to: '/playground/agents/$agentId/edit',
                      params: { agentId: agent.id },
                    })
                  }
                  data-testid={`edit-agent-${agent.id}`}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive
                    rounded-full"
                  onClick={handleDelete}
                  data-testid={`delete-agent-${agent.id}`}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4 pt-2">
            <AgentInfoRow
              label="Agent ID"
              value={<code className="text-xs">{agent.id}</code>}
            />
            <AgentInfoRow
              label="Default model"
              value={
                agent.defaultModel ? (
                  <code className="text-xs">
                    {agent.defaultModel.provider} · {agent.defaultModel.model}
                  </code>
                ) : (
                  <span className="text-muted-foreground">
                    Inherits the model selected in chat
                  </span>
                )
              }
            />
            {isBuiltin && (
              <p className="text-muted-foreground text-xs leading-5">
                Built-in agents are curated by ToolHive and cannot be edited.
                Duplicate this agent to create a customisable copy.
              </p>
            )}
          </div>
        </div>
      }
      rightPanel={
        <>
          <h4 className="text-foreground text-xl font-semibold tracking-tight">
            System prompt
          </h4>
          <div
            className="border-border mb-8 rounded-2xl border bg-white p-6
              dark:bg-transparent"
          >
            {agent.instructions.trim().length > 0 ? (
              <Streamdown
                plugins={STREAMDOWN_PLUGINS}
                className={STREAMDOWN_PROSE_CLASS}
              >
                {agent.instructions}
              </Streamdown>
            ) : (
              <p className="text-muted-foreground text-sm">
                This agent has no system prompt yet.
              </p>
            )}
          </div>
        </>
      }
    />
  )
}
