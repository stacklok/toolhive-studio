import { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import { Trash2Icon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'
import { DialogInstallSkill } from './dialog-install-skill'
import { DialogDeleteBuild } from './dialog-delete-build'
import { CardSkillBase } from './card-skill-base'
import { trackEvent } from '@/common/lib/analytics'
import { getBuildTitle } from '../lib/build-reference'

export function CardBuild({ build }: { build: LocalBuild }) {
  const [installOpen, setInstallOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const navigate = useNavigate()

  const title = getBuildTitle(build)
  const description = build.description
  const version = build.version
  const tag = build.tag
  const digest = build.digest

  const shortDigest = digest
    ? digest.startsWith('sha256:')
      ? `sha256:${digest.slice(7, 19)}…`
      : `${digest.slice(0, 12)}…`
    : undefined

  const badges =
    version || (tag && tag !== title) ? (
      <div className="flex flex-wrap gap-1.5">
        {version && <Badge variant="secondary">{version}</Badge>}
        {tag && tag !== title && (
          <Badge variant="outline" className="font-mono text-xs">
            {tag}
          </Badge>
        )}
      </div>
    ) : undefined

  const descriptionText =
    [description, shortDigest].filter(Boolean).join(' · ') || undefined

  return (
    <>
      <CardSkillBase
        title={title}
        description={descriptionText}
        badges={badges}
        onClick={
          tag
            ? () => {
                trackEvent('Skills: build card opened', {
                  has_tag: 'true',
                })
                void navigate({
                  to: '/skills/builds/$tag',
                  params: { tag },
                })
              }
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              className="relative z-10 rounded-full"
              onClick={(e) => {
                e.stopPropagation()
                trackEvent('Skills: delete build dialog opened', {
                  source: 'build_card',
                })
                setDeleteOpen(true)
              }}
              aria-label={`Remove ${title}`}
            >
              <Trash2Icon className="size-4" />
              Remove
            </Button>
            <Button
              variant="secondary"
              className="relative z-10 rounded-full"
              onClick={(e) => {
                e.stopPropagation()
                trackEvent('Skills: install dialog opened', {
                  source: 'build_card',
                })
                setInstallOpen(true)
              }}
              aria-label={`Install ${title}`}
            >
              Install
            </Button>
          </>
        }
      />

      <DialogInstallSkill
        key={`${build.name ?? tag ?? title}-${version ?? ''}`}
        open={installOpen}
        onOpenChange={setInstallOpen}
        defaultReference={build.name ?? tag}
        defaultVersion={version ?? ''}
      />
      <DialogDeleteBuild
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        build={build}
      />
    </>
  )
}
