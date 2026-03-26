import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaRegistryOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { useRegistryUpdateMutation } from './use-registry-update-mutation'
import {
  getRegistryAuthRequiredMessage,
  getRegistryUnavailableUrl,
  isRegistryAuthRequiredError,
  isRegistryUnavailableError,
} from './registry-list-error'

export function useRegistryData() {
  const {
    isPending: isPendingRegistry,
    data: registryListData,
    error: registryError,
  } = useQuery({
    ...getApiV1BetaRegistryOptions(),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const {
    mutateAsync: updateRegistry,
    isPending: isPendingUpdate,
    isError: isMutationError,
  } = useRegistryUpdateMutation()

  return {
    defaultRegistry: registryListData?.registries?.[0],
    isAuthRequiredError: isRegistryAuthRequiredError(registryError),
    isUnavailableError: isRegistryUnavailableError(registryError),
    registryAuthRequiredMessage: getRegistryAuthRequiredMessage(registryError),
    registryUnavailableUrl: getRegistryUnavailableUrl(registryError),
    isLoading: isPendingRegistry || isPendingUpdate,
    hasError: !!registryError,
    isMutationError,
    updateRegistry,
  }
}
