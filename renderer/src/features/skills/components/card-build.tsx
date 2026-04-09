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
import { DownloadIcon, Trash2Icon } from 'lucide-react'
import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'
import { DialogInstallSkill } from './dialog-install-skill'
import { DialogDeleteBuild } from './dialog-delete-build'

export function CardBuild({ build }: { build: LocalBuild }) {
  const [installOpen, setInstallOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const title = build.name ?? build.tag ?? 'Unnamed build'
  const description = build.description
  const version = build.version
  const tag = build.tag
  const digest = build.digest

  const shortDigest = digest
    ? digest.startsWith('sha256:')
      ? `sha256:${digest.slice(7, 19)}…`
      : `${digest.slice(0, 12)}…`
    : undefined

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
            {version && <Badge variant="secondary">{version}</Badge>}
            {tag && tag !== title && (
              <Badge variant="outline" className="font-mono text-xs">
                {tag}
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
          {shortDigest && (
            <p className="text-muted-foreground truncate font-mono text-xs">
              {shortDigest}
            </p>
          )}
        </CardContent>

        <CardFooter className="mt-auto flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive relative z-10"
            onClick={() => setDeleteOpen(true)}
            aria-label={`Remove ${title}`}
          >
            <Trash2Icon className="size-4" />
            Remove
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="relative z-10"
            onClick={() => setInstallOpen(true)}
            aria-label={`Install ${title}`}
          >
            <DownloadIcon className="size-4" />
            Install
          </Button>
        </CardFooter>
      </Card>

      <DialogInstallSkill
        key={tag ?? title}
        open={installOpen}
        onOpenChange={setInstallOpen}
        defaultReference={tag ?? build.name}
      />
      <DialogDeleteBuild
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        build={build}
      />
    </>
  )
}
