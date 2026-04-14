import { createFileRoute, notFound, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRegistryByRegistryNameV01xDevToolhiveSkillsByNamespaceBySkillNameOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { getRegistryByRegistryNameV01xDevToolhiveSkillsByNamespaceBySkillName } from '@common/api/generated/sdk.gen'
import { Button } from '@/common/components/ui/button'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoSearchResults } from '@/common/components/illustrations/illustration-no-search-results'
import { SkillDetailPage } from '@/features/skills/components/skill-detail-page'

function SkillNotFound() {
  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <EmptyState
        illustration={IllustrationNoSearchResults}
        title="Skill Not Found"
        body="The skill you're looking for doesn't exist in the registry or has been removed."
        actions={[
          <Button asChild key="skills" variant="action">
            <LinkViewTransition to="/skills">Browse Skills</LinkViewTransition>
          </Button>,
        ]}
      />
    </div>
  )
}

export const Route = createFileRoute('/skills_/$namespace/$skillName')({
  loader: async ({ context: { queryClient }, params }) => {
    const pathOptions = {
      path: {
        registryName: 'default' as const,
        namespace: params.namespace,
        skillName: params.skillName,
      },
    }
    return queryClient.ensureQueryData({
      ...getRegistryByRegistryNameV01xDevToolhiveSkillsByNamespaceBySkillNameOptions(
        pathOptions
      ),
      queryFn: async ({ signal }) => {
        const result =
          await getRegistryByRegistryNameV01xDevToolhiveSkillsByNamespaceBySkillName(
            { ...pathOptions, signal }
          )
        if (result.error !== undefined) {
          if (result.response.status === 404) {
            throw notFound()
          }
          throw result.error
        }
        return result.data
      },
    })
  },
  component: SkillDetail,
  notFoundComponent: SkillNotFound,
})

function SkillDetail() {
  const { namespace, skillName } = useParams({
    from: '/skills_/$namespace/$skillName',
  })
  const { data: skill } = useSuspenseQuery(
    getRegistryByRegistryNameV01xDevToolhiveSkillsByNamespaceBySkillNameOptions(
      {
        path: {
          registryName: 'default',
          namespace,
          skillName,
        },
      }
    )
  )

  if (!skill) return null

  return <SkillDetailPage skill={skill} />
}
