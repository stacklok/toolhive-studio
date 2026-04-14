import { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { ChevronLeft, TagIcon, GitForkIcon, ScaleIcon } from 'lucide-react'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { DialogInstallSkill } from './dialog-install-skill'

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
  const defaultReference =
    namespace && name !== 'Unknown skill' ? `${namespace}/${name}` : name

  return (
    <>
      <div className="flex w-full flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div>
            <LinkViewTransition to="/skills" search={{ tab: 'registry' }}>
              <Button variant="outline" className="rounded-full">
                <ChevronLeft className="size-4" />
                Back
              </Button>
            </LinkViewTransition>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-page-title m-0 p-0">{name}</h1>
            <div
              className="text-muted-foreground flex items-center gap-4 text-sm"
            >
              {version && (
                <span className="flex items-center gap-1">
                  <TagIcon className="size-4" />
                  {version}
                </span>
              )}
              {namespace && (
                <span className="flex items-center gap-1">
                  <GitForkIcon className="size-4" />
                  {namespace}
                </span>
              )}
              {license && (
                <span className="flex items-center gap-1">
                  <ScaleIcon className="size-4" />
                  {license}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main content: two columns */}
        <div className="flex gap-10">
          {/* Left: Summary + Install */}
          <div className="flex w-5/12 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h4
                className="text-foreground text-xl font-semibold tracking-tight"
              >
                Summary
              </h4>
              {description && (
                <p className="text-muted-foreground text-base leading-7">
                  {description}
                </p>
              )}
            </div>
            <div>
              <Button variant="action" onClick={() => setInstallOpen(true)}>
                Install
              </Button>
            </div>
          </div>

          {/* Right: Skill.md */}
          <div className="flex flex-1 flex-col gap-3">
            <h4 className="text-foreground text-xl font-semibold tracking-tight">
              Skill.md
            </h4>
            <div
              className="border-border rounded-2xl border bg-white p-6
                dark:bg-transparent"
            >
              <p
                className="text-muted-foreground font-mono text-sm
                  leading-relaxed"
              >
                Skill.md rendering is not yet available.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DialogInstallSkill
        open={installOpen}
        onOpenChange={setInstallOpen}
        defaultReference={defaultReference}
      />
    </>
  )
}
