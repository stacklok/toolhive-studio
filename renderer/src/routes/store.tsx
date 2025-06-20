import { getApiV1BetaRegistryByNameServersOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import { GridCardsRegistryServer } from '@/features/registry-servers/components/grid-cards-registry-server'
import { useRunFromRegistry } from '@/features/registry-servers/hooks/use-run-from-registry'

export const Route = createFileRoute('/store')({
  loader: async ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameServersOptions({ path: { name: 'default' } })
    ),
  component: Store,
})

export function Store() {
  const { servers: serversList = [] } = useLoaderData({ from: '/store' })
  const { handleSubmit } = useRunFromRegistry()

  return (
    <>
      <div className="mb-6 flex items-center">
        <h1 className="text-xl font-semibold">Store</h1>
      </div>
      {serversList.length === 0 ? (
        <div>No items found</div>
      ) : (
        <GridCardsRegistryServer
          servers={serversList}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}
