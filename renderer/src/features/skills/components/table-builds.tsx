import { useMemo, useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getApiV1BetaSkillsBuildsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationPackage } from '@/common/components/illustrations/illustration-package'
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
import { HammerIcon, Trash2Icon } from 'lucide-react'
import { DialogInstallSkill } from './dialog-install-skill'
import { DialogDeleteBuild } from './dialog-delete-build'

function getShortDigest(digest: string | undefined): string | undefined {
  if (!digest) return undefined
  if (digest.startsWith('sha256:')) {
    return `sha256:${digest.slice(7, 19)}…`
  }
  return `${digest.slice(0, 12)}…`
}

function activateOnKey(e: React.KeyboardEvent, onActivate: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    onActivate()
  }
}

function BuildRow({ build }: { build: LocalBuild }) {
  const navigate = useNavigate()
  const [installOpen, setInstallOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const title = build.name ?? build.tag ?? 'Unnamed build'
  const tag = build.tag
  const version = build.version
  const description = build.description
  const shortDigest = getShortDigest(build.digest)
  const subtitle = tag && tag !== title ? tag : undefined
  const canNavigate = !!tag

  function goToDetail() {
    if (!tag) return
    void navigate({
      to: '/skills/builds/$tag',
      params: { tag },
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
                      truncate font-mono text-xs"
                  >
                    {subtitle}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs font-mono text-xs break-all">
                  {subtitle}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TableCell>

        <TableCell className="py-3">
          {version ? (
            <Badge variant="secondary">{version}</Badge>
          ) : (
            <span className="text-muted-foreground/60 text-sm">—</span>
          )}
        </TableCell>

        <TableCell className="hidden py-3 lg:table-cell">
          {shortDigest ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="text-muted-foreground block truncate font-mono
                    text-xs"
                >
                  {shortDigest}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm font-mono text-xs break-all">
                {build.digest}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground/60 text-sm">—</span>
          )}
        </TableCell>

        <TableCell
          className="text-muted-foreground hidden w-full max-w-0 py-3
            md:table-cell"
        >
          {description ? (
            <Tooltip onlyWhenTruncated>
              <TooltipTrigger asChild>
                <span className="block truncate text-sm">{description}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                {description}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground/60 text-sm">—</span>
          )}
        </TableCell>

        <TableCell className="py-3 pr-3 text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteOpen(true)
              }}
              aria-label={`Remove ${title}`}
            >
              <Trash2Icon className="size-4" />
              Remove
            </Button>
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
          </div>
        </TableCell>
      </TableRow>

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

interface TableBuildsProps {
  filter: string
  onBuild: () => void
}

export function TableBuilds({ filter, onBuild }: TableBuildsProps) {
  const { data } = useSuspenseQuery(getApiV1BetaSkillsBuildsOptions())
  const builds: LocalBuild[] = useMemo(() => data?.builds ?? [], [data])
  const filteredData = useMemo(() => {
    return builds.filter((build) =>
      [build.name ?? '', build.description ?? '', build.tag ?? ''].some((f) =>
        f.toLowerCase().includes(filter.toLowerCase())
      )
    )
  }, [builds, filter])

  if (builds.length === 0) {
    return (
      <EmptyState
        title="No local builds"
        body="Build a skill from a local directory to see it here."
        illustration={IllustrationPackage}
        actions={[
          <Button key="build" variant="action" onClick={onBuild}>
            <HammerIcon className="size-4" />
            Build skill
          </Button>,
        ]}
      />
    )
  }

  if (filteredData.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p className="text-sm">No builds found matching the current filter</p>
      </div>
    )
  }

  return (
    <Table containerClassName="rounded-lg border">
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="text-muted-foreground font-medium">
            Build
          </TableHead>
          <TableHead className="text-muted-foreground w-[110px] font-medium">
            Version
          </TableHead>
          <TableHead
            className="text-muted-foreground hidden w-[160px] font-medium
              lg:table-cell"
          >
            Digest
          </TableHead>
          <TableHead
            className="text-muted-foreground hidden w-full max-w-0 font-medium
              md:table-cell"
          >
            About
          </TableHead>
          <TableHead className="w-[220px] pr-3" aria-label="Actions" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredData.map((build, index) => (
          <BuildRow
            key={build.digest ?? build.tag ?? build.name ?? `build-${index}`}
            build={build}
          />
        ))}
      </TableBody>
    </Table>
  )
}
