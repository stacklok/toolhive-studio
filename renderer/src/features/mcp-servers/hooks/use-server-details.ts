import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaRegistryByNameServersByServerName } from '@api/sdk.gen'

export function useServerDetails(serverName: string) {
  return useQuery({
    queryKey: ['serverDetails', serverName],
    queryFn: async () => {
      if (!serverName) return null
      try {
        const { data } = await getApiV1BetaRegistryByNameServersByServerName({
          path: {
            name: 'default',
            serverName,
          },
        })

        return data ?? {}
      } catch (error) {
        console.error(
          `Failed to fetch details for server ${serverName}:`,
          error
        )
        return null
      }
    },
  })
}
