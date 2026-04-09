import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getApiV1BetaSkillsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { TitlePage } from '@/common/components/title-page'
import { InputSearch } from '@/common/components/ui/input-search'
import { Button } from '@/common/components/ui/button'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationPackage } from '@/common/components/illustrations/illustration-package'
import { useFilterSort } from '@/common/hooks/use-filter-sort'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/common/components/ui/tabs'
import { GridCardsSkills } from './grid-cards-skills'
import { GridCardsBuilds } from './grid-cards-builds'
import { DialogInstallSkill } from './dialog-install-skill'
import { DialogBuildSkill } from './dialog-build-skill'
import { PlusIcon, HammerIcon } from 'lucide-react'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'

export function SkillsPage() {
  const [installOpen, setInstallOpen] = useState(false)
  const [buildOpen, setBuildOpen] = useState(false)
  const [tab, setTab] = useState<'installed' | 'builds'>('installed')

  const { data } = useSuspenseQuery(getApiV1BetaSkillsOptions())
  const skills: InstalledSkill[] = data?.skills ?? []

  const {
    filter: installedFilter,
    setFilter: setInstalledFilter,
    filteredData: filteredSkills,
  } = useFilterSort({
    data: skills,
    filterFields: (skill) => [
      skill.metadata?.name ?? '',
      skill.metadata?.description ?? '',
      skill.reference ?? '',
    ],
    sortBy: (skill) => skill.metadata?.name ?? skill.reference ?? '',
  })

  const [buildsFilter, setBuildsFilter] = useState('')

  const hasSkills = skills.length > 0

  const currentFilter = tab === 'installed' ? installedFilter : buildsFilter
  const setCurrentFilter =
    tab === 'installed' ? setInstalledFilter : setBuildsFilter

  const showSearch = (tab === 'installed' && hasSkills) || tab === 'builds'

  return (
    <>
      <TitlePage title="Skills">
        <div className="flex items-center gap-3">
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

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'installed' | 'builds')}
      >
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="installed">Installed</TabsTrigger>
            <TabsTrigger value="builds">Local Builds</TabsTrigger>
          </TabsList>
          {showSearch && (
            <InputSearch
              value={currentFilter}
              onChange={(v) => setCurrentFilter(v)}
              placeholder="Search..."
            />
          )}
        </div>

        <TabsContent value="installed">
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
            <GridCardsSkills skills={filteredSkills} />
          )}
        </TabsContent>

        <TabsContent value="builds">
          <GridCardsBuilds
            filter={buildsFilter}
            onBuild={() => setBuildOpen(true)}
          />
        </TabsContent>
      </Tabs>

      <DialogInstallSkill open={installOpen} onOpenChange={setInstallOpen} />
      <DialogBuildSkill open={buildOpen} onOpenChange={setBuildOpen} />
    </>
  )
}
