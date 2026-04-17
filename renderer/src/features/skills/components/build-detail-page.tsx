import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { TagIcon, CodeIcon, FingerprintIcon, Trash2Icon } from 'lucide-react'
import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'
import { DialogInstallSkill } from './dialog-install-skill'
import { DialogDeleteBuild } from './dialog-delete-build'
import { SkillDetailLayout } from './skill-detail-layout'
import { SkillMarkdown } from './skill-markdown'

interface BuildDetailPageProps {
  build: LocalBuild
}

export function BuildDetailPage({ build }: BuildDetailPageProps) {
  const [installOpen, setInstallOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const navigate = useNavigate()

  const title = build.name ?? build.tag ?? 'Unnamed build'
  const version = build.version
  const tag = build.tag
  const digest = build.digest
  const description = build.description

  const shortDigest = digest
    ? digest.startsWith('sha256:')
      ? `sha256:${digest.slice(7, 19)}…`
      : `${digest.slice(0, 12)}…`
    : undefined

  const hasBadges = !!(version || (tag && tag !== title) || shortDigest)

  return (
    <>
      <SkillDetailLayout
        title={title}
        backTo="/skills"
        backSearch={{ tab: 'builds' }}
        badges={
          hasBadges ? (
            <>
              {version && (
                <span
                  className="text-muted-foreground flex items-center gap-1
                    text-sm"
                >
                  <TagIcon className="size-4" />
                  {version}
                </span>
              )}
              {tag && tag !== title && (
                <span
                  className="text-muted-foreground flex items-center gap-1
                    font-mono text-sm"
                >
                  <CodeIcon className="size-4" />
                  {tag}
                </span>
              )}
              {shortDigest && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="text-muted-foreground flex cursor-default
                        items-center gap-1 font-mono text-sm"
                    >
                      <FingerprintIcon className="size-4" />
                      {shortDigest}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    className="max-w-xs font-mono text-xs break-all"
                  >
                    {digest}
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          ) : undefined
        }
        description={description}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setDeleteOpen(true)}>
              <Trash2Icon className="size-4" />
              Remove
            </Button>
            <Button variant="action" onClick={() => setInstallOpen(true)}>
              Install
            </Button>
          </div>
        }
        rightPanel={
          <>
            <h4 className="text-foreground text-xl font-semibold tracking-tight">
              SKILL.md
            </h4>
            <div
              className="border-border mb-8 rounded-2xl border bg-white p-6
                dark:bg-transparent"
            >
              {tag ? (
                <SkillMarkdown skillRef={tag} stripFrontmatter />
              ) : (
                <p className="text-muted-foreground text-sm">
                  No SKILL.md available for this build.
                </p>
              )}
            </div>
          </>
        }
      />

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
        onSuccess={() =>
          void navigate({ to: '/skills', search: { tab: 'builds' } })
        }
      />
    </>
  )
}
