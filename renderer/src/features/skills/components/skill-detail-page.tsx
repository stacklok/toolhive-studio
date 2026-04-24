import { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import { TagIcon, GithubIcon, ScaleIcon } from 'lucide-react'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { DialogInstallSkill } from './dialog-install-skill'
import { SkillDetailLayout } from './skill-detail-layout'
import {
  getSkillInstallReference,
  getSkillOciRef,
} from '../lib/skill-reference'
import { getDisplayRepoLabel } from '../lib/get-display-repo-label'
import { SkillMarkdown } from './skill-markdown'
import { trackEvent } from '@/common/lib/analytics'

interface SkillDetailPageProps {
  skill: RegistrySkill
}

export function SkillDetailPage({ skill }: SkillDetailPageProps) {
  const [installOpen, setInstallOpen] = useState(false)

  const name = skill.name ?? 'Unknown skill'
  const namespace = skill.namespace
  const description = skill.description
  const version = skill.version
  const license = skill.license
  const repoLabel = getDisplayRepoLabel(skill.repository?.url)
  const defaultReference = getSkillInstallReference(skill)
  const ociRef = getSkillOciRef(skill)

  const hasBadges = !!(version || repoLabel || license)

  return (
    <>
      <SkillDetailLayout
        title={name}
        backTo="/skills"
        backSearch={{ tab: 'registry' }}
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
              {repoLabel && (
                <span
                  className="text-muted-foreground flex items-center gap-1
                    text-sm"
                >
                  <GithubIcon className="size-4" />
                  {repoLabel}
                </span>
              )}
              {license && (
                <span
                  className="text-muted-foreground flex items-center gap-1
                    text-sm"
                >
                  <ScaleIcon className="size-4" />
                  {license}
                </span>
              )}
            </>
          ) : undefined
        }
        description={description}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="action"
              onClick={() => {
                trackEvent('Skills: install dialog opened', {
                  source: 'registry_detail',
                  name,
                  namespace: namespace ?? '',
                })
                setInstallOpen(true)
              }}
            >
              Install
            </Button>
            {skill.repository?.url && (
              <Button
                asChild
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  trackEvent('Skills: detail github clicked', {
                    name,
                    namespace: namespace ?? '',
                  })
                }
              >
                <a
                  href={skill.repository.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GithubIcon className="size-4" />
                  GitHub
                </a>
              </Button>
            )}
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
              {ociRef ? (
                <SkillMarkdown skillRef={ociRef} stripFrontmatter />
              ) : (
                <p className="text-muted-foreground text-sm">
                  No SKILL.md available for this skill.
                </p>
              )}
            </div>
          </>
        }
      />

      <DialogInstallSkill
        open={installOpen}
        onOpenChange={setInstallOpen}
        defaultReference={defaultReference}
      />
    </>
  )
}
