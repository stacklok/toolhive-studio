import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaSkillsBuildsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationPackage } from '@/common/components/illustrations/illustration-package'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/common/lib/utils'
import { HammerIcon } from 'lucide-react'
import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'
import { CardBuild } from './card-build'

interface GridCardsBuildsProps {
  filter: string
  onBuild: () => void
}

export function GridCardsBuilds({ filter, onBuild }: GridCardsBuildsProps) {
  const { data } = useQuery(getApiV1BetaSkillsBuildsOptions())
  const builds: LocalBuild[] = useMemo(() => data?.builds ?? [], [data])
  const filteredData = useMemo(() => {
    return builds.filter((build) =>
      [build.name ?? '', build.description ?? '', build.tag ?? ''].some((f) =>
        f.toLowerCase().includes(filter.toLowerCase())
      )
    )
  }, [builds, filter])

  if (builds.length === 0) {
    return (
      <EmptyState
        title="No local builds"
        body="Build a skill from a local directory to see it here."
        illustration={IllustrationPackage}
        actions={[
          <Button key="build" variant="action" onClick={onBuild}>
            <HammerIcon className="size-4" />
            Build skill
          </Button>,
        ]}
      />
    )
  }

  if (filteredData.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p className="text-sm">No builds found matching the current filter</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        filteredData.length <= 3
          ? 'grid-cols-[repeat(auto-fill,minmax(max(200px,min(300px,100%)),1fr))]'
          : 'grid-cols-[repeat(auto-fit,minmax(max(200px,min(300px,100%)),1fr))]'
      )}
    >
      {filteredData.map((build, index) => (
        <CardBuild
          key={build.digest ?? build.tag ?? build.name ?? `build-${index}`}
          build={build}
        />
      ))}
    </div>
  )
}
