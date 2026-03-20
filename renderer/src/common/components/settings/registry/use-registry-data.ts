import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaRegistryOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { useRegistryUpdateMutation } from './use-registry-update-mutation'
import {
  getRegistryAuthRequiredMessage,
  isRegistryAuthRequiredError,
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
    registryAuthRequiredMessage: getRegistryAuthRequiredMessage(registryError),
    isLoading: isPendingRegistry || isPendingUpdate,
    hasError: !!registryError,
    isMutationError,
    updateRegistry,
  }
}
