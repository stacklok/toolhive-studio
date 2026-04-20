import { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { FolderGit2Icon, Trash2Icon, UserIcon } from 'lucide-react'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'
import { DialogUninstallSkill } from './dialog-uninstall-skill'
import { CardSkillBase } from './card-skill-base'

const statusVariantMap = {
  installed: 'success',
  pending: 'secondary',
  failed: 'destructive',
} as const

const MAX_VISIBLE_CLIENTS = 3

export function CardSkill({ skill }: { skill: InstalledSkill }) {
  const [uninstallOpen, setUninstallOpen] = useState(false)

  const title = skill.metadata?.name ?? skill.reference ?? 'Unknown skill'
  const status = skill.status
  const scope = skill.scope
  const clients = skill.clients ?? []
  const visibleClients = clients.slice(0, MAX_VISIBLE_CLIENTS)
  const hiddenClients = clients.slice(MAX_VISIBLE_CLIENTS)
  const projectRoot = scope === 'project' ? skill.project_root : undefined
  const projectRootLabel = projectRoot
    ? `/${projectRoot.split(/[\\/]/).filter(Boolean).at(-1) ?? projectRoot}`
    : null

  const clientBadges = (
    <>
      {visibleClients.map((client) => (
        <Badge key={client} variant="outline">
          {client}
        </Badge>
      ))}
      {hiddenClients.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              aria-label={`${hiddenClients.length} more clients`}
            >
              +{hiddenClients.length}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <ul className="flex flex-col gap-0.5 text-xs">
              {hiddenClients.map((client) => (
                <li key={client}>{client}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </>
  )

  const isProjectScope = scope === 'project'

  const badges = (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {status && (
          <Badge variant={statusVariantMap[status] ?? 'secondary'}>
            {status}
          </Badge>
        )}
        {scope && (
          <Badge variant="secondary" className="capitalize">
            {scope === 'project' ? (
              <FolderGit2Icon aria-hidden />
            ) : (
              <UserIcon aria-hidden />
            )}
            {scope}
          </Badge>
        )}
        {projectRootLabel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="font-mono">
                {projectRootLabel}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs font-mono text-xs break-all">
              {projectRoot}
            </TooltipContent>
          </Tooltip>
        )}
        {!isProjectScope && clientBadges}
      </div>
      {isProjectScope && clients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">{clientBadges}</div>
      )}
    </div>
  )

  return (
    <>
      <CardSkillBase
        title={title}
        badges={badges}
        footer={
          <Button
            variant="secondary"
            className="relative z-10 rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              setUninstallOpen(true)
            }}
            aria-label={`Uninstall ${title}`}
          >
            <Trash2Icon className="size-4" />
            Uninstall
          </Button>
        }
      />

      <DialogUninstallSkill
        open={uninstallOpen}
        onOpenChange={setUninstallOpen}
        skill={skill}
      />
    </>
  )
}
