import { useState } from 'react'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { cn } from '@/common/lib/utils'
import { Trash2Icon } from 'lucide-react'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'
import { DialogUninstallSkill } from './dialog-uninstall-skill'

const statusVariantMap = {
  installed: 'success',
  pending: 'secondary',
  failed: 'destructive',
} as const

export function CardSkill({ skill }: { skill: InstalledSkill }) {
  const [uninstallOpen, setUninstallOpen] = useState(false)

  const title = skill.metadata?.name ?? skill.reference ?? 'Unknown skill'
  const description = skill.metadata?.description
  const reference = skill.reference
  const status = skill.status
  const scope = skill.scope

  return (
    <>
      <Card
        className={cn(
          'relative flex flex-col',
          'transition-[box-shadow,color]',
          'group',
          'hover:ring',
          'has-[button:focus-visible]:ring'
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-start justify-between gap-2 text-xl">
            <Tooltip onlyWhenTruncated>
              <TooltipTrigger asChild>
                <span className="truncate select-none">{title}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{title}</TooltipContent>
            </Tooltip>
          </CardTitle>
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
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          {description && (
            <p className="text-muted-foreground mb-2 text-sm select-none">
              {description}
            </p>
          )}
          {reference && (
            <p className="text-muted-foreground truncate font-mono text-xs">
              {reference}
            </p>
          )}
        </CardContent>

        <CardFooter className="mt-auto flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive relative z-10"
            onClick={() => setUninstallOpen(true)}
            aria-label={`Uninstall ${title}`}
          >
            <Trash2Icon className="size-4" />
            Uninstall
          </Button>
        </CardFooter>
      </Card>

      <DialogUninstallSkill
        open={uninstallOpen}
        onOpenChange={setUninstallOpen}
        skill={skill}
      />
    </>
  )
}
