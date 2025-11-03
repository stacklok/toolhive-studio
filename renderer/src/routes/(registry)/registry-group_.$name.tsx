import { createFileRoute, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getApiV1BetaRegistryByNameOptions } from '@api/@tanstack/react-query.gen'
import { Badge } from '@/common/components/ui/badge'
import { RegistryDetailHeader } from '@/features/registry-servers/components/registry-detail-header'

export const Route = createFileRoute('/(registry)/registry-group_/$name')({
  loader: async ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameOptions({ path: { name: 'default' } })
    )
  },
  component: RegistryGroupDetail,
})

export function RegistryGroupDetail() {
  const { name } = useParams({ from: '/(registry)/registry-group_/$name' })
  const { data: registryData } = useSuspenseQuery(
    getApiV1BetaRegistryByNameOptions({ path: { name: 'default' } })
  )
  const group = registryData?.registry?.groups?.find((g) => g.name === name)
  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <RegistryDetailHeader
        title={name}
        badges={
          <Badge
            variant="secondary"
            className="bg-foreground/5 w-fit rounded-full px-2.5 py-0.5"
          >
            Group
          </Badge>
        }
        description={group?.description ?? undefined}
      />
    </div>
  )
}
