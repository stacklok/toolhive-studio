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

  const getToolsDiffFromRegistry = (
    tools: string[]
  ): {
    hasExactMatch: boolean
    addedTools: string[]
    missingTools: string[]
  } | null => {
    if (!matchedRegistryItem?.tools) {
      return null
    }

    // Check for exact match first
    if (matchedRegistryItem.tools.length === tools.length) {
      const sortedRegistryTools = [...matchedRegistryItem.tools].sort()
      const sortedTools = [...tools].sort()

      const hasExactMatch = sortedRegistryTools.every(
        (name, i) => sortedTools[i] === name
      )

      if (hasExactMatch) {
        return {
          hasExactMatch: true,
          addedTools: [],
          missingTools: [],
        }
      }
    }

    // Calculate diff if no exact match
    const registryToolsSet = new Set(matchedRegistryItem.tools)
    const serverToolsSet = new Set(tools)

    // Tools in server but not in registry (deduplicated)
    const addedTools = Array.from(serverToolsSet).filter(
      (tool) => !registryToolsSet.has(tool)
    )

    // Tools in registry but not in server (deduplicated)
    const missingTools = Array.from(registryToolsSet).filter(
      (tool) => !serverToolsSet.has(tool)
    )

    return {
      hasExactMatch: false,
      addedTools,
      missingTools,
    }
  }

  if (!isFromRegistry || !serverName)
    return {
      getToolsDiffFromRegistry,
      isFromRegistry: false,
      registryTools: [],
      drift,
    }

  return {
    getToolsDiffFromRegistry,
    isFromRegistry,
    registryTools: matchedRegistryItem.tools,
    drift,
  }
}
