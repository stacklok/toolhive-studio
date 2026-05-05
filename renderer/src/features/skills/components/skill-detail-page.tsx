import { useEffect, useState } from 'react'
import { Button } from '@/common/components/ui/button'
import {
  TagIcon,
  GitForkIcon,
  GithubIcon,
  PlusIcon,
  ScaleIcon,
} from 'lucide-react'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { DialogInstallSkill } from './dialog-install-skill'
import { SkillDetailLayout } from './skill-detail-layout'
import { getSkillInstallDefaults, getSkillOciRef } from '../lib/skill-reference'
import { getDisplayRepoLabel } from '../lib/get-display-repo-label'
import { SkillMarkdown } from './skill-markdown'
import { trackEvent } from '@/common/lib/analytics'

interface SkillDetailPageProps {
  skill: RegistrySkill
  /**
   * Route-param namespace. Always present on this page, unlike
   * `skill.namespace` which is optional on the registry response.
   */
  namespace: string
  /**
   * Route-param skill name. Always present on this page, unlike
   * `skill.name` which is optional on the registry response.
   */
  skillName: string
  /** When true, opens the install dialog on mount (e.g. from a deep link). */
  initialInstall?: boolean
  /**
   * Overrides the metadata-derived default version when prefilling the
   * install dialog. Sourced from the deep-link `?version=<v>` param.
   */
  initialVersion?: string
}

export function SkillDetailPage({
  skill,
  namespace,
  skillName,
  initialInstall,
  initialVersion,
}: SkillDetailPageProps) {
  const [installOpen, setInstallOpen] = useState(initialInstall ?? false)
  const [overrideVersion, setOverrideVersion] = useState<string | undefined>(
    initialVersion
  )

  const name = skill.name ?? 'Unknown skill'
  const description = skill.description
  const version = skill.version
  const license = skill.license
  const repoLabel = getDisplayRepoLabel(skill.repository?.url)
  const installDefaults = getSkillInstallDefaults(skill)
  const ociRef = getSkillOciRef(skill)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          namespace: string
          skillName: string
          version?: string
        }>
      ).detail
      if (detail.namespace === namespace && detail.skillName === skillName) {
        setOverrideVersion(detail.version)
        setInstallOpen(true)
      }
    }
    window.addEventListener('toolhive:open-install-skill-modal', handler)
    return () =>
      window.removeEventListener('toolhive:open-install-skill-modal', handler)
  }, [namespace, skillName])

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
                  <GitForkIcon className="size-4" />
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
                  namespace,
                })
                setOverrideVersion(undefined)
                setInstallOpen(true)
              }}
            >
              <PlusIcon className="size-4" />
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
                    namespace,
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
        defaultReference={installDefaults.reference}
        defaultVersion={overrideVersion ?? installDefaults.version}
      />
    </>
  )
}
