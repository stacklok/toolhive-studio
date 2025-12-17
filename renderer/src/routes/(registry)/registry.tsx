import {
  getApiV1BetaRegistryByNameServersOptions,
  getApiV1BetaRegistryByNameOptions,
} from '@api/@tanstack/react-query.gen'
import { createFileRoute } from '@tanstack/react-router'
import { RegistryError } from '@/common/components/error/registry-error'
import RegistryRouteComponent from './registry.route'

const DEFAULT_REGISTRY_NAME = 'default'

export const Route = createFileRoute('/(registry)/registry')({
  loader: async ({ context: { queryClient } }) => {
    const serversPromise = queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameServersOptions({
        path: { name: DEFAULT_REGISTRY_NAME },
      })
    )
    const registryPromise = queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameOptions({
        path: { name: DEFAULT_REGISTRY_NAME },
      })
    )
    return Promise.all([serversPromise, registryPromise])
  },
  component: RegistryRouteComponent,
  errorComponent: () => <RegistryError />,
})
