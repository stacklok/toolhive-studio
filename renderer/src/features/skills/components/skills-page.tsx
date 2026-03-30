import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getApiV1BetaSkillsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { TitlePage } from '@/common/components/title-page'
import { InputSearch } from '@/common/components/ui/input-search'
import { Button } from '@/common/components/ui/button'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationPackage } from '@/common/components/illustrations/illustration-package'
import { useFilterSort } from '@/common/hooks/use-filter-sort'
import { GridCardsSkills } from './grid-cards-skills'
import { DialogInstallSkill } from './dialog-install-skill'
import { DialogBuildSkill } from './dialog-build-skill'
import { PlusIcon, HammerIcon } from 'lucide-react'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'

export function SkillsPage() {
  const [installOpen, setInstallOpen] = useState(false)
  const [buildOpen, setBuildOpen] = useState(false)

  const { data } = useSuspenseQuery(getApiV1BetaSkillsOptions())
  const skills: InstalledSkill[] = data?.skills ?? []

  const { filter, setFilter, filteredData } = useFilterSort({
    data: skills,
    filterFields: (skill) => [
      skill.metadata?.name ?? '',
      skill.metadata?.description ?? '',
      skill.reference ?? '',
    ],
    sortBy: (skill) => skill.metadata?.name ?? skill.reference ?? '',
  })

  const hasSkills = skills.length > 0

  return (
    <>
      <TitlePage title="Skills">
        <div className="flex items-center gap-3">
          {hasSkills && (
            <InputSearch
              value={filter}
              onChange={(v) => setFilter(v)}
              placeholder="Search..."
            />
          )}
          <Button
            variant="secondary"
            onClick={() => setBuildOpen(true)}
            className="shrink-0"
          >
            <HammerIcon className="size-4" />
            Build skill
          </Button>
          <Button
            variant="action"
            onClick={() => setInstallOpen(true)}
            className="shrink-0"
          >
            <PlusIcon className="size-4" />
            Install skill
          </Button>
        </div>
      </TitlePage>

      {!hasSkills ? (
        <EmptyState
          title="No skills installed"
          body="Install a skill to extend your AI agent's capabilities."
          actions={[
            <Button
              key="install"
              variant="action"
              onClick={() => setInstallOpen(true)}
            >
              <PlusIcon className="size-4" />
              Install skill
            </Button>,
          ]}
          illustration={IllustrationPackage}
        />
      ) : (
        <GridCardsSkills skills={filteredData} />
      )}

      <DialogInstallSkill open={installOpen} onOpenChange={setInstallOpen} />
      <DialogBuildSkill open={buildOpen} onOpenChange={setBuildOpen} />
    </>
  )
}
