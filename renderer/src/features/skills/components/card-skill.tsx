import { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { Trash2Icon } from 'lucide-react'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'
import { DialogUninstallSkill } from './dialog-uninstall-skill'
import { CardSkillBase } from './card-skill-base'

const statusVariantMap = {
  installed: 'success',
  pending: 'secondary',
  failed: 'destructive',
} as const

export function CardSkill({ skill }: { skill: InstalledSkill }) {
  const [uninstallOpen, setUninstallOpen] = useState(false)

  const title = skill.metadata?.name ?? skill.reference ?? 'Unknown skill'
  const status = skill.status
  const scope = skill.scope
  const clients = skill.clients
  const projectRoot = scope === 'project' ? skill.project_root : undefined
  const projectRootLabel = projectRoot
    ? `/${projectRoot.split(/[\\/]/).filter(Boolean).at(-1) ?? projectRoot}`
    : null

  const badges = (
    <div className="flex flex-wrap gap-1.5">
      {status && (
        <Badge variant={statusVariantMap[status] ?? 'secondary'}>
          {status}
        </Badge>
      )}
      {scope && (
        <Badge variant="outline" className="capitalize">
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
      {clients?.map((client) => (
        <Badge key={client} variant="outline">
          {client}
        </Badge>
      ))}
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
