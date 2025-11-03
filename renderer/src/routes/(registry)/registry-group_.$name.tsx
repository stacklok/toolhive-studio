import { createFileRoute, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getApiV1BetaRegistryByNameOptions } from '@api/@tanstack/react-query.gen'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { ChevronLeft } from 'lucide-react'

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
      <div className="my-2">
        <LinkViewTransition to="/registry">
          <Button
            variant="link"
            aria-label="Back"
            className="text-muted-foreground"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
        </LinkViewTransition>
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="m-0 mb-0 p-0 text-3xl font-bold">{name}</h1>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="bg-foreground/5 w-fit rounded-full px-2.5 py-0.5"
          >
            Group
          </Badge>
        </div>
        {group?.description && (
          <div className="text-muted-foreground flex-[2] select-none">
            {group.description}
          </div>
        )}
      </div>
    </div>
  )
}
