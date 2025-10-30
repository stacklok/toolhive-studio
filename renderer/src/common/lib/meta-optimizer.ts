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
  getApiV1BetaGroupsQueryKey,
  getApiV1BetaRegistryByNameServersByServerNameOptions,
  getApiV1BetaWorkloadsByNameOptions,
} from '@api/@tanstack/react-query.gen'
import {
  META_MCP_SERVER_NAME,
  MCP_OPTIMIZER_GROUP_NAME,
  ALLOWED_GROUPS_ENV_VAR,
  isProbablyUsingNativeContainers,
} from './constants'

async function ensureMetaOptimizerWorkload() {
  try {
    const workloadDetail = await queryClient.fetchQuery(
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
    log.error('[ensureMetaOptimizerWorkload] Error fetching workload:', error)
    return undefined
  }
}

async function createMetaOptimizerWorkload() {
  try {
    const workloadDetail = await ensureMetaOptimizerWorkload()
    if (workloadDetail?.group === MCP_OPTIMIZER_GROUP_NAME) {
      return workloadDetail
    }

    // Try to fetch mcp-optimizer first, fall back to meta-mcp if not found
    let server
    try {
      const response = await queryClient.fetchQuery(
        getApiV1BetaRegistryByNameServersByServerNameOptions({
          path: {
            name: 'default',
            serverName: 'mcp-optimizer',
          },
        })
      )
      server = response.server
    } catch {
      log.info(
        '[createMetaOptimizerWorkload] mcp-optimizer not found in registry, falling back to meta-mcp'
      )
      // Fallback to meta-mcp registry entry
      const response = await queryClient.fetchQuery(
        getApiV1BetaRegistryByNameServersByServerNameOptions({
          path: {
            name: 'default',
            serverName: 'meta-mcp',
          },
        })
      )
      server = response.server
    }

    if (!server) {
      log.info('[createMetaOptimizerWorkload] Server not found in the registry')
      return
    }

    // On platforms with native containers (Linux), use host networking mode
    // to allow the container to access the host's ToolHive API
    const useHostNetworking = isProbablyUsingNativeContainers()

    const body: V1CreateRequest = {
      name: META_MCP_SERVER_NAME,
      image: server.image,
      transport: server.transport,
      env_vars: {
        [ALLOWED_GROUPS_ENV_VAR]: 'default',
      },
      secrets: [],
      cmd_arguments: [],
      network_isolation: false,
      volumes: [],
      group: MCP_OPTIMIZER_GROUP_NAME,
      ...(useHostNetworking && {
        permission_profile: {
          network: {
            mode: 'host',
          },
        },
      }),
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
    queryKey: getApiV1BetaGroupsQueryKey(),
  })

  // Create workload after group creation succeeds
  return await createMetaOptimizerWorkload()
}

async function ensureMetaOptimizerGroup() {
  try {
    const rawGroups = await queryClient.fetchQuery({
      queryKey: getApiV1BetaGroupsQueryKey(),
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

    return await createMetaOptimizerWorkload()
  } catch (error) {
    log.error('[ensureMetaOptimizerGroup] Error checking group:', error)
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
      await ensureMetaOptimizerGroup()
    }
  } catch (error) {
    log.error('[initMetaOptimizer] Failed to initialize meta optimizer:', error)
  }
}
