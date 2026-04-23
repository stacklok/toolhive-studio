import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Github } from 'lucide-react'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { Button } from '@/common/components/ui/button'
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
import { DialogInstallSkill } from './dialog-install-skill'
import { getSkillInstallReference } from '../lib/skill-reference'

function activateOnKey(e: React.KeyboardEvent, onActivate: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    onActivate()
  }
}

function RegistrySkillRow({ skill }: { skill: RegistrySkill }) {
  const navigate = useNavigate()
  const [installOpen, setInstallOpen] = useState(false)

  const title = skill.name ?? 'Unknown skill'
  const namespace = skill.namespace
  const canNavigate = !!(namespace && skill.name)

  function goToDetail() {
    if (!canNavigate) return
    void navigate({
      to: '/skills/$namespace/$skillName',
      params: { namespace: namespace!, skillName: skill.name! },
    })
  }

  return (
    <>
      <TableRow
        role={canNavigate ? 'button' : undefined}
        tabIndex={canNavigate ? 0 : undefined}
        aria-label={canNavigate ? title : undefined}
        onClick={canNavigate ? goToDetail : undefined}
        onKeyDown={
          canNavigate ? (e) => activateOnKey(e, goToDetail) : undefined
        }
        className={canNavigate ? 'cursor-pointer' : undefined}
      >
        <TableCell className="py-3 font-medium">
          <Tooltip onlyWhenTruncated>
            <TooltipTrigger asChild>
              <span className="block max-w-[280px] truncate">{title}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{title}</TooltipContent>
          </Tooltip>
        </TableCell>

        <TableCell className="text-muted-foreground hidden py-3 lg:table-cell">
          {namespace ? (
            <Tooltip onlyWhenTruncated>
              <TooltipTrigger asChild>
                <span className="block max-w-[200px] truncate text-sm">
                  {namespace}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{namespace}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground/60 text-sm">—</span>
          )}
        </TableCell>

        <TableCell
          className="text-muted-foreground hidden w-full max-w-0 py-3
            md:table-cell"
        >
          {skill.description ? (
            <Tooltip onlyWhenTruncated>
              <TooltipTrigger asChild>
                <span className="block truncate text-sm">
                  {skill.description}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                {skill.description}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground/60 text-sm">—</span>
          )}
        </TableCell>

        <TableCell className="py-3">
          {skill.repository?.url ? (
            <a
              href={skill.repository.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:bg-accent inline-flex
                size-8 items-center justify-center rounded-md"
              aria-label="Open repository on GitHub"
            >
              <Github className="size-4" />
            </a>
          ) : null}
        </TableCell>

        <TableCell className="py-3 pr-3 text-right">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              setInstallOpen(true)
            }}
            aria-label={`Install ${title}`}
          >
            Install
          </Button>
        </TableCell>
      </TableRow>

      <DialogInstallSkill
        open={installOpen}
        onOpenChange={setInstallOpen}
        defaultReference={getSkillInstallReference(skill)}
      />
    </>
  )
}

export function TableRegistrySkills({ skills }: { skills: RegistrySkill[] }) {
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
          <TableHead
            className="text-muted-foreground hidden w-[200px] font-medium
              lg:table-cell"
          >
            Registry
          </TableHead>
          <TableHead
            className="text-muted-foreground hidden w-full max-w-0 font-medium
              md:table-cell"
          >
            About
          </TableHead>
          <TableHead className="w-12" aria-label="Repository" />
          <TableHead className="w-[120px] pr-3" aria-label="Actions" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {skills.map((skill, index) => (
          <RegistrySkillRow
            key={
              skill.namespace && skill.name
                ? `${skill.namespace}/${skill.name}`
                : `skill-${index}`
            }
            skill={skill}
          />
        ))}
      </TableBody>
    </Table>
  )
}
