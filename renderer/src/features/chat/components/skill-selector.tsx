import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import log from 'electron-log/renderer'
import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/common/components/ui/dropdown-menu'
import {
  ChevronDown,
  FileText,
  FolderGit2Icon,
  Loader2,
  UserIcon,
} from 'lucide-react'
import { Badge } from '@/common/components/ui/badge'
import { ScrollArea } from '@/common/components/ui/scroll-area'
import { cn } from '@/common/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { trackEvent } from '@/common/lib/analytics'
import { useAvailableSkills } from '../hooks/use-available-skills'
import { useAgents, useThreadAgentId } from '../../agents/hooks/use-agents'
import { DEFAULT_AGENT_ID } from '@common/types/agents'

function projectLeaf(projectRoot: string): string {
  return projectRoot.split(/[\\/]/).filter(Boolean).at(-1) ?? projectRoot
}

interface SkillSelectorProps {
  threadId?: string | null
}

export function SkillSelector({ threadId }: SkillSelectorProps) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  // Toggling skills is a no-op for any agent that does not bind the `skills`
  // built-in tool bundle (the bundle is what reads `enabled_skills` and
  // injects the list into the system prompt). Disable the picker — but keep
  // it visible — when the active agent doesn't, so the affordance stays
  // discoverable and we can explain *why* via the tooltip.
  const { data: agents = [] } = useAgents()
  const { data: threadAgentId } = useThreadAgentId(threadId ?? undefined)
  const activeAgent = agents.find(
    (a) => a.id === (threadAgentId || DEFAULT_AGENT_ID)
  )
  const supportsSkills = activeAgent?.builtinToolsKey === 'skills'

  const {
    availableSkills,
    enabledSet,
    enabledNames,
    enabledCount,
    isLoading: skillsLoading,
  } = useAvailableSkills()

  const handleToggleSkill = async (name: string) => {
    const wasEnabled = enabledSet.has(name)
    trackEvent(
      wasEnabled
        ? `Playground: disable skill ${name}`
        : `Playground: enable skill ${name}`
    )
    setToggling(name)
    try {
      const response = await window.electronAPI.chat.setEnabledSkill(
        name,
        !wasEnabled
      )
      if (!response.success) {
        toast.error(`Failed to toggle skill "${name}"`, {
          description: response.error,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['enabled-skills'] })
    } catch (error) {
      log.error('Failed to toggle skill:', error)
      toast.error(`Failed to toggle skill "${name}"`)
    } finally {
      setToggling(null)
    }
  }

  const handleClearAll = async () => {
    try {
      trackEvent('Playground: disable all skills', {
        skill_count: enabledNames.length,
      })
      // Iterate the raw allow-list (not the joined `availableSkills`) so the
      // button still wipes rows whose underlying skill is no longer
      // installed — defense in depth alongside the server-side prune.
      await Promise.allSettled(
        enabledNames.map((name) =>
          window.electronAPI.chat.setEnabledSkill(name, false)
        )
      )
      queryClient.invalidateQueries({ queryKey: ['enabled-skills'] })
    } catch (error) {
      log.error('Failed to clear enabled skills:', error)
      toast.error('Failed to clear enabled skills')
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) trackEvent('Playground: open skill selector')
    setIsOpen(open)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex h-8 items-center justify-between gap-1.5 px-2
                has-[>svg]:px-2"
              data-testid="skill-selector-trigger"
              disabled={!supportsSkills}
              aria-label="Skills picker"
            >
              <FileText className="size-4" />
              <span className="tabular-nums">{enabledCount}</span>
              <ChevronDown
                className="size-4"
                data-testid="skill-selector-chevron"
              />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {!supportsSkills ? (
            <span>
              Skills are only used by agents bound to the Skills bundle (e.g.{' '}
              <strong>Skill Engineer</strong>). Switch agent to enable.
            </span>
          ) : (
            <>
              {enabledCount} of {availableSkills.length} skill
              {availableSkills.length === 1 ? '' : 's'} enabled
            </>
          )}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" side="top" className="max-h-96 w-72">
        <DropdownMenuLabel>Available skills</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea>
          {skillsLoading && availableSkills.length === 0 ? (
            <div
              className="text-muted-foreground flex items-center gap-2 p-2
                text-sm"
            >
              <Loader2 className="size-4 animate-spin" /> Loading skills…
            </div>
          ) : availableSkills.length === 0 ? (
            <div className="text-muted-foreground p-2 text-sm">
              No skills installed. Install one from the Skills page.
            </div>
          ) : (
            availableSkills.map((skill) => {
              const checked = enabledSet.has(skill.name)
              return (
                <DropdownMenuCheckboxItem
                  key={skill.name}
                  checked={checked}
                  onCheckedChange={() => handleToggleSkill(skill.name)}
                  onSelect={(event) => event.preventDefault()}
                  className={cn('flex cursor-pointer items-start gap-3 py-1.5')}
                  disabled={toggling === skill.name}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="max-w-48 truncate font-normal">
                          {skill.name}
                          {skill.version ? ` · ${skill.version}` : ''}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {skill.description ? skill.description : skill.name}
                      </TooltipContent>
                    </Tooltip>
                    <div className="flex flex-wrap gap-1">
                      {skill.variants.map((variant, idx) => {
                        if (variant.scope === 'user') {
                          return (
                            <Badge
                              key={`user-${idx}`}
                              variant="outline"
                              className="gap-1 px-1.5 py-0 font-light"
                            >
                              <UserIcon aria-hidden className="size-3" />
                              User
                            </Badge>
                          )
                        }
                        const root = variant.projectRoot ?? ''
                        const label = root ? projectLeaf(root) : 'project'
                        return (
                          <Tooltip key={`project-${idx}-${root}`}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="gap-1 px-1.5 py-0 font-mono text-xs
                                  font-light"
                              >
                                <FolderGit2Icon
                                  aria-hidden
                                  className="size-3"
                                />
                                /{label}
                              </Badge>
                            </TooltipTrigger>
                            {root && (
                              <TooltipContent
                                className="max-w-xs font-mono text-xs break-all"
                              >
                                {root}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                  {toggling === skill.name && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                </DropdownMenuCheckboxItem>
              )
            })
          )}
        </ScrollArea>

        {(availableSkills.length > 0 || enabledNames.length > 0) && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer font-light"
                onClick={handleClearAll}
                disabled={enabledNames.length === 0}
              >
                Clear enabled skills
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
