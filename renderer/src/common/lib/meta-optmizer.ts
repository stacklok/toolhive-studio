import { featureFlagKeys } from '../../../../utils/feature-flags'
import log from 'electron-log/renderer'
import { queryClient } from './query-client'
import {
  getApiV1BetaGroups,
  postApiV1BetaGroups,
  postApiV1BetaWorkloads,
} from '@api/sdk.gen'
import type { V1CreateRequest } from '@api/types.gen'
import {
  getApiV1BetaRegistryByNameServersByServerNameOptions,
  getApiV1BetaWorkloadsByNameOptions,
} from '@api/@tanstack/react-query.gen'

export const MCP_OPTIMIZER_GROUP_NAME = 'mcp-optimizer---'
export const META_MCP_SERVER_NAME = 'meta-mcp'

async function getMetaOptimizerWorkload() {
  try {
    const workloadDetail = await queryClient.ensureQueryData(
      getApiV1BetaWorkloadsByNameOptions({
        path: { name: META_MCP_SERVER_NAME },
      })
    )

    return workloadDetail
  } catch (error) {
    const isNotFoundError =
      typeof error === 'string' && error.includes('Workload not found')

    if (isNotFoundError) {
      return undefined
    }

    // Log unexpected errors
    log.error('[getMetaOptimizerWorkload] Error fetching workload:', error)
    return undefined
  }
}

async function createMetaOptimizerWorkload() {
  try {
    const workloadDetail = await getMetaOptimizerWorkload()
    if (workloadDetail) {
      return workloadDetail
    }

    const { server } = await queryClient.ensureQueryData(
      getApiV1BetaRegistryByNameServersByServerNameOptions({
        path: {
          name: 'default',
          serverName: META_MCP_SERVER_NAME,
        },
      })
    )
    if (!server) {
      log.info('[createMetaOptimizerWorkload] Server not found in the registry')
      return
    }

    const body: V1CreateRequest = {
      name: META_MCP_SERVER_NAME,
      image: server.image,
      transport: server.transport,
      env_vars: {},
      secrets: [],
      cmd_arguments: [],
      network_isolation: false,
      volumes: [],
      group: MCP_OPTIMIZER_GROUP_NAME,
    }

    const response = await postApiV1BetaWorkloads({
      body,
    })

    if (response.error) {
      log.error(
        '[createMetaOptimizerWorkload] Failed to create meta optimizer workload:',
        response.error
      )
      return
    }
    return response.data
  } catch (error) {
    log.error(
      '[createMetaOptimizerWorkload] Failed to create meta optimizer workload:',
      error instanceof Error ? error.message : error
    )
    return
  }
}

async function createMetaOptimizerGroup() {
  const response = await postApiV1BetaGroups({
    body: { name: MCP_OPTIMIZER_GROUP_NAME },
  })

  if (response.error) {
    log.error(
      '[createMetaOptimizerGroup] Failed to create group:',
      response.error
    )
    return undefined
  }

  await queryClient.invalidateQueries({
    queryKey: ['api', 'v1beta', 'groups'],
  })

  return response.data
}

async function checkMetaOptimizerGroup() {
  try {
    const rawGroups = await queryClient.ensureQueryData({
      queryKey: ['api', 'v1beta', 'groups'],
      queryFn: async () => {
        const response = await getApiV1BetaGroups()

        if (response.error) {
          throw new Error(`Failed to fetch groups: ${response.error}`)
        }

        return response.data
      },
      staleTime: 0,
      gcTime: 0,
    })

    const metaOptimizerGrp = rawGroups?.groups?.find(
      (group) => group.name === MCP_OPTIMIZER_GROUP_NAME
    )
    if (!metaOptimizerGrp) {
      return await createMetaOptimizerGroup()
    }

    return metaOptimizerGrp
  } catch (error) {
    log.error('[checkMetaOptimizerGroup] Error checking group:', error)
    return undefined
  }
}

export async function initMetaOptimizer() {
  try {
    const [experimentalFeaturesEnabled, metaOptimizerEnabled] =
      await Promise.allSettled([
        window.electronAPI.featureFlags.get(
          // Check experimental features flag to prevent inconsistent state.
          // Currently, the meta optimizer cannot be disabled independently,
          // so we need to check this flag as well.
          featureFlagKeys.EXPERIMENTAL_FEATURES
        ),
        window.electronAPI.featureFlags.get(featureFlagKeys.META_OPTIMIZER),
      ])

    const isExperimentalEnabled =
      experimentalFeaturesEnabled.status === 'fulfilled' &&
      experimentalFeaturesEnabled.value === true

    const isOptimizerEnabled =
      metaOptimizerEnabled.status === 'fulfilled' &&
      metaOptimizerEnabled.value === true

    if (isExperimentalEnabled && isOptimizerEnabled) {
      await checkMetaOptimizerGroup()
      await createMetaOptimizerWorkload()
    }
  } catch (error) {
    log.error('[initMetaOptimizer] Failed to initialize meta optimizer:', error)
  }
}
