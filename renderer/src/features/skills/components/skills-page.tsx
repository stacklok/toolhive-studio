import { useState } from 'react'
import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import {
  getApiV1BetaSkillsOptions,
  getRegistryByRegistryNameV01xDevToolhiveSkillsOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { TitlePage } from '@/common/components/title-page'
import { InputSearch } from '@/common/components/ui/input-search'
import { Button } from '@/common/components/ui/button'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationPackage } from '@/common/components/illustrations/illustration-package'
import { useFilterSort } from '@/common/hooks/use-filter-sort'
import { useDebouncedCallback } from '@/common/hooks/use-debounced-callback'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/common/components/ui/tabs'
import { GridCardsSkills } from './grid-cards-skills'
import { GridCardsBuilds } from './grid-cards-builds'
import { GridCardsRegistrySkills } from './grid-cards-registry-skills'
import { DialogInstallSkill } from './dialog-install-skill'
import { DialogBuildSkill } from './dialog-build-skill'
import { PlusIcon, HammerIcon } from 'lucide-react'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'
import { useNavigate, useSearch } from '@tanstack/react-router'

type Tab = 'registry' | 'installed' | 'builds'

export function SkillsPage() {
  const [installOpen, setInstallOpen] = useState(false)
  const [buildOpen, setBuildOpen] = useState(false)
  const { tab } = useSearch({ from: '/skills' })
  const navigate = useNavigate({ from: '/skills' })

  function setTab(value: Tab) {
    void navigate({ search: { tab: value }, replace: true })
  }

  // Registry tab search (server-side, debounced)
  const [registrySearch, setRegistrySearch] = useState('')
  const [debouncedRegistrySearch, setDebouncedRegistrySearch] = useState('')
  const debouncedSetRegistrySearch = useDebouncedCallback(
    setDebouncedRegistrySearch,
    300
  )

  function handleRegistrySearchChange(value: string) {
    setRegistrySearch(value)
    debouncedSetRegistrySearch(value)
  }

  const { data: registryData } = useQuery(
    getRegistryByRegistryNameV01xDevToolhiveSkillsOptions({
      path: { registryName: 'default' },
      query: debouncedRegistrySearch
        ? { q: debouncedRegistrySearch }
        : undefined,
    })
  )
  const registrySkills = registryData?.skills ?? []

  // Installed tab
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

  // Builds tab
  const [buildsFilter, setBuildsFilter] = useState('')

  const hasSkills = skills.length > 0

  const currentFilter =
    tab === 'registry'
      ? registrySearch
      : tab === 'installed'
        ? installedFilter
        : buildsFilter

  const setCurrentFilter =
    tab === 'registry'
      ? handleRegistrySearchChange
      : tab === 'installed'
        ? setInstalledFilter
        : setBuildsFilter

  const showSearch =
    tab === 'registry' || (tab === 'installed' && hasSkills) || tab === 'builds'

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

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="registry">Registry</TabsTrigger>
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

        <TabsContent value="registry">
          <GridCardsRegistrySkills skills={registrySkills} />
        </TabsContent>

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
