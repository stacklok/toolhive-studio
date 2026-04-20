import { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/common/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { FolderGit2Icon, Trash2Icon, UserIcon } from 'lucide-react'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'
import { DialogUninstallSkill } from './dialog-uninstall-skill'
import { SkillClientsBadges } from './skill-clients-badges'
import { skillStatusVariantMap } from './skill-status'

function SkillRow({ skill }: { skill: InstalledSkill }) {
  const [uninstallOpen, setUninstallOpen] = useState(false)

  const title = skill.metadata?.name ?? skill.reference ?? 'Unknown skill'
  const subtitle =
    skill.reference && skill.reference !== title ? skill.reference : undefined
  const status = skill.status
  const scope = skill.scope
  const clients = skill.clients ?? []
  const projectRoot = scope === 'project' ? skill.project_root : undefined
  const projectRootLabel = projectRoot
    ? `/${projectRoot.split(/[\\/]/).filter(Boolean).at(-1) ?? projectRoot}`
    : null
  const isProjectScope = scope === 'project'
  const modeLabel = isProjectScope ? 'Repo' : scope === 'user' ? 'User' : null

  return (
    <>
      <TableRow>
        <TableCell className="py-3 font-medium">
          <div className="flex min-w-0 flex-col">
            <Tooltip onlyWhenTruncated>
              <TooltipTrigger asChild>
                <span className="block max-w-[260px] truncate">{title}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{title}</TooltipContent>
            </Tooltip>
            {subtitle && (
              <Tooltip onlyWhenTruncated>
                <TooltipTrigger asChild>
                  <span
                    className="text-muted-foreground block max-w-[260px]
                      truncate text-xs"
                  >
                    {subtitle}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{subtitle}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TableCell>

        <TableCell className="w-[110px] py-3">
          {modeLabel ? (
            <span className="inline-flex items-center gap-1.5 text-sm">
              {isProjectScope ? (
                <FolderGit2Icon aria-hidden className="size-3.5" />
              ) : (
                <UserIcon aria-hidden className="size-3.5" />
              )}
              {modeLabel}
            </span>
          ) : (
            <span className="text-muted-foreground/60 text-sm">—</span>
          )}
        </TableCell>

        <TableCell className="w-full max-w-0 py-3">
          {isProjectScope ? (
            <div className="flex flex-col items-start gap-1.5">
              {projectRootLabel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="font-mono">
                      {projectRootLabel}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent
                    className="max-w-xs font-mono text-xs break-all"
                  >
                    {projectRoot}
                  </TooltipContent>
                </Tooltip>
              )}
              {clients.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <SkillClientsBadges clients={clients} />
                </div>
              )}
            </div>
          ) : clients.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              <SkillClientsBadges clients={clients} />
            </div>
          ) : (
            <span className="text-muted-foreground/60 text-sm">—</span>
          )}
        </TableCell>

        <TableCell className="w-[1%] py-3 whitespace-nowrap">
          {status ? (
            <Badge variant={skillStatusVariantMap[status] ?? 'secondary'}>
              {status}
            </Badge>
          ) : (
            <span className="text-muted-foreground/60 text-sm">—</span>
          )}
        </TableCell>

        <TableCell className="w-[120px] py-3 text-right">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              setUninstallOpen(true)
            }}
            aria-label={`Uninstall ${title}`}
          >
            <Trash2Icon className="size-4" />
            Uninstall
          </Button>
        </TableCell>
      </TableRow>

      <DialogUninstallSkill
        open={uninstallOpen}
        onOpenChange={setUninstallOpen}
        skill={skill}
      />
    </>
  )
}

export function TableInstalledSkills({ skills }: { skills: InstalledSkill[] }) {
  if (skills.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p className="text-sm">No skills found matching the current filter</p>
      </div>
    )
  }

  return (
    <Table containerClassName="rounded-lg border">
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="text-muted-foreground font-medium">
            Skill
          </TableHead>
          <TableHead className="text-muted-foreground w-[110px] font-medium">
            Mode
          </TableHead>
          <TableHead
            className="text-muted-foreground w-full max-w-0 font-medium"
          >
            Destination
          </TableHead>
          <TableHead
            className="text-muted-foreground w-[1%] font-medium
              whitespace-nowrap"
          >
            Status
          </TableHead>
          <TableHead className="w-[120px]" aria-label="Actions" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {skills.map((skill, index) => (
          <SkillRow
            key={skill.reference ?? skill.metadata?.name ?? `skill-${index}`}
            skill={skill}
          />
        ))}
      </TableBody>
    </Table>
  )
}
