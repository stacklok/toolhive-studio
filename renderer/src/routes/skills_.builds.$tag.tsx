import { createFileRoute, notFound, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getApiV1BetaSkillsBuildsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { Button } from '@/common/components/ui/button'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoSearchResults } from '@/common/components/illustrations/illustration-no-search-results'
import { BuildDetailPage } from '@/features/skills/components/build-detail-page'

function BuildNotFound() {
  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <EmptyState
        illustration={IllustrationNoSearchResults}
        title="Build Not Found"
        body="The build you're looking for doesn't exist or has been removed."
        actions={[
          <Button asChild key="builds" variant="action">
            <LinkViewTransition to="/skills" search={{ tab: 'builds' }}>
              Browse Builds
            </LinkViewTransition>
          </Button>,
        ]}
      />
    </div>
  )
}

export const Route = createFileRoute('/skills_/builds/$tag')({
  params: {
    parse: ({ tag }) => ({ tag: decodeURIComponent(tag) }),
    stringify: ({ tag }) => ({ tag: encodeURIComponent(tag) }),
  },
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getApiV1BetaSkillsBuildsOptions()),
  component: BuildDetail,
  notFoundComponent: BuildNotFound,
})

function BuildDetail() {
  const { tag } = useParams({ from: '/skills_/builds/$tag' })
  const { data } = useSuspenseQuery(getApiV1BetaSkillsBuildsOptions())
  const build = data?.builds?.find((b) => b.tag === tag)

  if (!build) throw notFound()

  return <BuildDetailPage build={build} />
}
