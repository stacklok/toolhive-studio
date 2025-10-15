import {
  getApiV1BetaRegistryByNameServersOptions,
  getApiV1BetaWorkloadsByNameOptions,
} from '@api/@tanstack/react-query.gen'
import { useQuery } from '@tanstack/react-query'

function getImageNameWithoutTag(image: string | undefined): string {
  if (!image) return ''
  const lastColonIndex = image.lastIndexOf(':')
  return lastColonIndex !== -1 ? image.slice(0, lastColonIndex) : image
}

function getImageTag(image: string | undefined): string {
  if (!image) return ''
  const lastColonIndex = image.lastIndexOf(':')
  return lastColonIndex !== -1 ? image.slice(lastColonIndex + 1) : ''
}

export function useIsServerFromRegistry(serverName: string) {
  const { data: workload } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: serverName || '' },
    }),
    enabled: !!serverName,
    retry: false,
  })
  const { data } = useQuery({
    ...getApiV1BetaRegistryByNameServersOptions({ path: { name: 'default' } }),
    enabled: !!serverName,
    retry: false,
  })
  const { servers: serversList = [] } = data || {}

  const matchedRegistryItem = workload?.image?.length
    ? serversList.find(
        (item) =>
          getImageNameWithoutTag(item.image) ===
          getImageNameWithoutTag(workload?.image)
      )
    : undefined

  const isFromRegistry =
    matchedRegistryItem && !!matchedRegistryItem?.tools?.length

  const registryTag =
    matchedRegistryItem && getImageTag(matchedRegistryItem.image)
  const localTag = getImageTag(workload?.image)

  const hasTagDrift = registryTag !== localTag

  const drift = hasTagDrift
    ? {
        localTag,
        registryTag,
      }
    : null

  if (!isFromRegistry || !serverName)
    return {
      isFromRegistry: false,
      registryTools: [],
      drift,
    }

  return {
    isFromRegistry,
    registryTools: matchedRegistryItem.tools,
    drift,
  }
}
