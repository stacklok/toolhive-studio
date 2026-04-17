import { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import { TagIcon, GitForkIcon, ScaleIcon } from 'lucide-react'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { DialogInstallSkill } from './dialog-install-skill'
import { SkillDetailLayout } from './skill-detail-layout'
import { getSkillOciRef } from '../lib/get-skill-oci-ref'
import { SkillMarkdown } from './skill-markdown'

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
  const isOci = skill.packages?.some((p) => p.registryType === 'oci')
  const base =
    namespace && name !== 'Unknown skill' ? `${namespace}/${name}` : name
  const defaultReference = isOci && version ? `${base}:${version}` : base
  const ociRef = getSkillOciRef(skill)

  const hasBadges = !!(version || namespace || license)

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
              {namespace && (
                <span
                  className="text-muted-foreground flex items-center gap-1
                    text-sm"
                >
                  <GitForkIcon className="size-4" />
                  {namespace}
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
              {ociRef ? (
                <SkillMarkdown ociRef={ociRef} />
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
