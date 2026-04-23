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
import { Pagination } from '@/common/components/ui/pagination'
import { GridCardsSkills } from './grid-cards-skills'
import { GridCardsBuilds } from './grid-cards-builds'
import { GridCardsRegistrySkills } from './grid-cards-registry-skills'
import { TableInstalledSkills } from './table-installed-skills'
import { TableRegistrySkills } from './table-registry-skills'
import { TableBuilds } from './table-builds'
import { DialogBuildSkill } from './dialog-build-skill'
import { HammerIcon } from 'lucide-react'
import { ViewToggle } from '@/common/components/view-toggle'
import { useViewPreference } from '@/common/hooks/use-view-preference'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { SkillsSearch } from '@/routes/skills'
import { trackEvent } from '@/common/lib/analytics'
import { REGISTRY_PAGE_SIZE_OPTIONS } from '../lib/registry-pagination'

type Tab = 'registry' | 'installed' | 'builds'

export function SkillsPage() {
  const [buildOpen, setBuildOpen] = useState(false)
  const {
    tab,
    page: registryPage,
    limit: registryLimit,
  } = useSearch({ from: '/skills' })
  const navigate = useNavigate({ from: '/skills' })

  function setTab(value: Tab) {
    trackEvent('Skills: tab changed', { tab: value })
    void navigate({
      search: (prev: SkillsSearch) => ({ ...prev, tab: value }),
      replace: true,
    })
  }

  function setRegistryPage(page: number) {
    void navigate({
      search: (prev: SkillsSearch) => ({ ...prev, page }),
      replace: true,
    })
  }

  function setRegistryLimit(limit: number) {
    void navigate({
      search: (prev: SkillsSearch) => ({ ...prev, limit, page: 1 }),
      replace: true,
    })
  }

  // Registry tab search (server-side, debounced). The debounced callback only
  // fires as a result of user input, so resetting the page to 1 here is a
  // regular event handler — no effect required.
  const [registrySearch, setRegistrySearch] = useState('')
  const [debouncedRegistrySearch, setDebouncedRegistrySearch] = useState('')
  const debouncedSetRegistrySearch = useDebouncedCallback((value: string) => {
    setDebouncedRegistrySearch(value)
    void navigate({
      search: (prev: SkillsSearch) => ({ ...prev, page: 1 }),
      replace: true,
    })
    trackEvent('Skills: registry search', {
      query_length: value.length,
      has_query: value.length > 0 ? 'true' : 'false',
    })
  }, 300)

  function handleRegistrySearchChange(value: string) {
    setRegistrySearch(value)
    debouncedSetRegistrySearch(value)
  }

  const { data: registryData } = useQuery({
    ...getRegistryByRegistryNameV01xDevToolhiveSkillsOptions({
      path: { registryName: 'default' },
      query: {
        page: registryPage,
        limit: registryLimit,
        ...(debouncedRegistrySearch ? { q: debouncedRegistrySearch } : {}),
      },
    }),
    placeholderData: (prev) => prev,
  })
  const registrySkills = registryData?.skills ?? []
  const registryMetadata = registryData?.metadata

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

  const { view: installedView, setView: setInstalledView } = useViewPreference(
    'ui.viewMode.skillsInstalled'
  )
  const { view: registryView, setView: setRegistryView } = useViewPreference(
    'ui.viewMode.skillsRegistry'
  )
  const { view: buildsView, setView: setBuildsView } = useViewPreference(
    'ui.viewMode.skillsBuilds'
  )

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
              <>
                <InputSearch
                  value={registrySearch}
                  onChange={handleRegistrySearchChange}
                  placeholder="Search..."
                />
                <ViewToggle
                  value={registryView}
                  onChange={(view) => {
                    trackEvent('Skills: view toggled', {
                      tab: 'registry',
                      view,
                    })
                    setRegistryView(view)
                  }}
                />
              </>
            )}
            {tab === 'installed' && hasSkills && (
              <>
                <InputSearch
                  value={installedFilter}
                  onChange={setInstalledFilter}
                  placeholder="Search..."
                />
                <ViewToggle
                  value={installedView}
                  onChange={(view) => {
                    trackEvent('Skills: view toggled', {
                      tab: 'installed',
                      view,
                    })
                    setInstalledView(view)
                  }}
                />
              </>
            )}
            {tab === 'builds' && (
              <>
                <InputSearch
                  value={buildsFilter}
                  onChange={setBuildsFilter}
                  placeholder="Search..."
                />
                <ViewToggle
                  value={buildsView}
                  onChange={(view) => {
                    trackEvent('Skills: view toggled', {
                      tab: 'builds',
                      view,
                    })
                    setBuildsView(view)
                  }}
                />
                <Button
                  variant="action"
                  onClick={() => {
                    trackEvent('Skills: build dialog opened', {
                      source: 'builds_tab',
                    })
                    setBuildOpen(true)
                  }}
                  className="shrink-0"
                >
                  <HammerIcon className="size-4" />
                  Build skill
                </Button>
              </>
            )}
          </div>
        </div>

        <TabsContent value="registry" className="flex flex-col gap-4">
          {registryView === 'table' ? (
            <TableRegistrySkills skills={registrySkills} />
          ) : (
            <GridCardsRegistrySkills skills={registrySkills} />
          )}
          <Pagination
            page={registryMetadata?.page ?? registryPage}
            pageSize={registryMetadata?.limit ?? registryLimit}
            total={registryMetadata?.total ?? 0}
            pageSizeOptions={REGISTRY_PAGE_SIZE_OPTIONS}
            itemLabel="skills"
            onPageChange={(page) => {
              trackEvent('Skills: registry page changed', {
                page,
                limit: registryLimit,
              })
              setRegistryPage(page)
            }}
            onPageSizeChange={(limit) => {
              trackEvent('Skills: registry page size changed', {
                limit,
              })
              setRegistryLimit(limit)
            }}
          />
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
          ) : installedView === 'table' ? (
            <TableInstalledSkills skills={filteredSkills} />
          ) : (
            <GridCardsSkills skills={filteredSkills} />
          )}
        </TabsContent>

        <TabsContent value="builds">
          {buildsView === 'table' ? (
            <TableBuilds
              filter={buildsFilter}
              onBuild={() => {
                trackEvent('Skills: build dialog opened', {
                  source: 'builds_empty_state',
                })
                setBuildOpen(true)
              }}
            />
          ) : (
            <GridCardsBuilds
              filter={buildsFilter}
              onBuild={() => {
                trackEvent('Skills: build dialog opened', {
                  source: 'builds_empty_state',
                })
                setBuildOpen(true)
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      <DialogBuildSkill open={buildOpen} onOpenChange={setBuildOpen} />
    </>
  )
}
