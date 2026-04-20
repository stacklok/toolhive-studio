import { useState } from 'react'
import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import {
  getApiV1BetaSkillsOptions,
  getRegistryByRegistryNameV01xDevToolhiveSkillsOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
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
import { DialogBuildSkill } from './dialog-build-skill'
import { HammerIcon } from 'lucide-react'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'
import { useNavigate, useSearch } from '@tanstack/react-router'

type Tab = 'registry' | 'installed' | 'builds'

export function SkillsPage() {
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

  return (
    <>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="gap-4"
      >
        <div className="flex items-center justify-between gap-4">
          <TabsList variant="pill">
            <TabsTrigger value="registry">Registry</TabsTrigger>
            <TabsTrigger value="installed">Installed</TabsTrigger>
            <TabsTrigger value="builds">Local Builds</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3">
            {tab === 'registry' && (
              <InputSearch
                value={registrySearch}
                onChange={handleRegistrySearchChange}
                placeholder="Search..."
              />
            )}
            {tab === 'installed' && hasSkills && (
              <InputSearch
                value={installedFilter}
                onChange={setInstalledFilter}
                placeholder="Search..."
              />
            )}
            {tab === 'builds' && (
              <>
                <InputSearch
                  value={buildsFilter}
                  onChange={setBuildsFilter}
                  placeholder="Search..."
                />
                <Button
                  variant="action"
                  onClick={() => setBuildOpen(true)}
                  className="shrink-0"
                >
                  <HammerIcon className="size-4" />
                  Build skill
                </Button>
              </>
            )}
          </div>
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
                  key="browse"
                  variant="action"
                  onClick={() => setTab('registry')}
                >
                  Browse registry
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

      <DialogBuildSkill open={buildOpen} onOpenChange={setBuildOpen} />
    </>
  )
}
