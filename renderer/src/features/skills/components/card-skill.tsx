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
import { SkillClientsBadges } from './skill-clients-badges'
import { skillStatusVariantMap } from './skill-status'
import { trackEvent } from '@/common/lib/analytics'

export function CardSkill({ skill }: { skill: InstalledSkill }) {
  const [uninstallOpen, setUninstallOpen] = useState(false)

  const title = skill.metadata?.name ?? skill.reference ?? 'Unknown skill'
  const status = skill.status
  const scope = skill.scope
  const clients = skill.clients ?? []
  const projectRoot = scope === 'project' ? skill.project_root : undefined
  const projectRootLabel = projectRoot
    ? `/${projectRoot.split(/[\\/]/).filter(Boolean).at(-1) ?? projectRoot}`
    : null

  const isProjectScope = scope === 'project'

  const badges = (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {status && (
          <Badge variant={skillStatusVariantMap[status] ?? 'secondary'}>
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
        {!isProjectScope && <SkillClientsBadges clients={clients} />}
      </div>
      {isProjectScope && clients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <SkillClientsBadges clients={clients} />
        </div>
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
              trackEvent('Skills: uninstall dialog opened', {
                source: 'installed_card',
                scope: scope ?? 'unknown',
              })
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
