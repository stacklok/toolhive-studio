// This file is auto-generated by @hey-api/openapi-ts

import type { Options as ClientOptions, TDataShape, Client } from './client'
import type {
  GetApiOpenapiJsonData,
  GetApiOpenapiJsonResponses,
  GetApiV1BetaClientsData,
  GetApiV1BetaClientsResponses,
  PostApiV1BetaClientsData,
  PostApiV1BetaClientsResponses,
  PostApiV1BetaClientsErrors,
  PostApiV1BetaClientsRegisterData,
  PostApiV1BetaClientsRegisterResponses,
  PostApiV1BetaClientsRegisterErrors,
  PostApiV1BetaClientsUnregisterData,
  PostApiV1BetaClientsUnregisterResponses,
  PostApiV1BetaClientsUnregisterErrors,
  DeleteApiV1BetaClientsByNameData,
  DeleteApiV1BetaClientsByNameResponses,
  DeleteApiV1BetaClientsByNameErrors,
  GetApiV1BetaDiscoveryClientsData,
  GetApiV1BetaDiscoveryClientsResponses,
  GetApiV1BetaGroupsData,
  GetApiV1BetaGroupsResponses,
  GetApiV1BetaGroupsErrors,
  PostApiV1BetaGroupsData,
  PostApiV1BetaGroupsResponses,
  PostApiV1BetaGroupsErrors,
  DeleteApiV1BetaGroupsByNameData,
  DeleteApiV1BetaGroupsByNameResponses,
  DeleteApiV1BetaGroupsByNameErrors,
  GetApiV1BetaGroupsByNameData,
  GetApiV1BetaGroupsByNameResponses,
  GetApiV1BetaGroupsByNameErrors,
  GetApiV1BetaRegistryData,
  GetApiV1BetaRegistryResponses,
  PostApiV1BetaRegistryData,
  PostApiV1BetaRegistryErrors,
  DeleteApiV1BetaRegistryByNameData,
  DeleteApiV1BetaRegistryByNameResponses,
  DeleteApiV1BetaRegistryByNameErrors,
  GetApiV1BetaRegistryByNameData,
  GetApiV1BetaRegistryByNameResponses,
  GetApiV1BetaRegistryByNameErrors,
  GetApiV1BetaRegistryByNameServersData,
  GetApiV1BetaRegistryByNameServersResponses,
  GetApiV1BetaRegistryByNameServersErrors,
  GetApiV1BetaRegistryByNameServersByServerNameData,
  GetApiV1BetaRegistryByNameServersByServerNameResponses,
  GetApiV1BetaRegistryByNameServersByServerNameErrors,
  PostApiV1BetaSecretsData,
  PostApiV1BetaSecretsResponses,
  PostApiV1BetaSecretsErrors,
  GetApiV1BetaSecretsDefaultData,
  GetApiV1BetaSecretsDefaultResponses,
  GetApiV1BetaSecretsDefaultErrors,
  GetApiV1BetaSecretsDefaultKeysData,
  GetApiV1BetaSecretsDefaultKeysResponses,
  GetApiV1BetaSecretsDefaultKeysErrors,
  PostApiV1BetaSecretsDefaultKeysData,
  PostApiV1BetaSecretsDefaultKeysResponses,
  PostApiV1BetaSecretsDefaultKeysErrors,
  DeleteApiV1BetaSecretsDefaultKeysByKeyData,
  DeleteApiV1BetaSecretsDefaultKeysByKeyResponses,
  DeleteApiV1BetaSecretsDefaultKeysByKeyErrors,
  PutApiV1BetaSecretsDefaultKeysByKeyData,
  PutApiV1BetaSecretsDefaultKeysByKeyResponses,
  PutApiV1BetaSecretsDefaultKeysByKeyErrors,
  GetApiV1BetaVersionData,
  GetApiV1BetaVersionResponses,
  GetApiV1BetaWorkloadsData,
  GetApiV1BetaWorkloadsResponses,
  GetApiV1BetaWorkloadsErrors,
  PostApiV1BetaWorkloadsData,
  PostApiV1BetaWorkloadsResponses,
  PostApiV1BetaWorkloadsErrors,
  PostApiV1BetaWorkloadsDeleteData,
  PostApiV1BetaWorkloadsDeleteResponses,
  PostApiV1BetaWorkloadsDeleteErrors,
  PostApiV1BetaWorkloadsRestartData,
  PostApiV1BetaWorkloadsRestartResponses,
  PostApiV1BetaWorkloadsRestartErrors,
  PostApiV1BetaWorkloadsStopData,
  PostApiV1BetaWorkloadsStopResponses,
  PostApiV1BetaWorkloadsStopErrors,
  DeleteApiV1BetaWorkloadsByNameData,
  DeleteApiV1BetaWorkloadsByNameResponses,
  DeleteApiV1BetaWorkloadsByNameErrors,
  GetApiV1BetaWorkloadsByNameData,
  GetApiV1BetaWorkloadsByNameResponses,
  GetApiV1BetaWorkloadsByNameErrors,
  GetApiV1BetaWorkloadsByNameExportData,
  GetApiV1BetaWorkloadsByNameExportResponses,
  GetApiV1BetaWorkloadsByNameExportErrors,
  GetApiV1BetaWorkloadsByNameLogsData,
  GetApiV1BetaWorkloadsByNameLogsResponses,
  GetApiV1BetaWorkloadsByNameLogsErrors,
  PostApiV1BetaWorkloadsByNameRestartData,
  PostApiV1BetaWorkloadsByNameRestartResponses,
  PostApiV1BetaWorkloadsByNameRestartErrors,
  PostApiV1BetaWorkloadsByNameStopData,
  PostApiV1BetaWorkloadsByNameStopResponses,
  PostApiV1BetaWorkloadsByNameStopErrors,
  GetHealthData,
  GetHealthResponses,
} from './types.gen'
import { client as _heyApiClient } from './client.gen'

export type Options<
  TData extends TDataShape = TDataShape,
  ThrowOnError extends boolean = boolean,
> = ClientOptions<TData, ThrowOnError> & {
  /**
   * You can provide a client instance returned by `createClient()` instead of
   * individual options. This might be also useful if you want to implement a
   * custom client.
   */
  client?: Client
  /**
   * You can pass arbitrary values through the `meta` object. This can be
   * used to access values that aren't defined as part of the SDK function.
   */
  meta?: Record<string, unknown>
}

/**
 * Get OpenAPI specification
 * Returns the OpenAPI specification for the API
 */
export const getApiOpenapiJson = <ThrowOnError extends boolean = false>(
  options?: Options<GetApiOpenapiJsonData, ThrowOnError>
) => {
  return (options?.client ?? _heyApiClient).get<
    GetApiOpenapiJsonResponses,
    unknown,
    ThrowOnError
  >({
    url: '/api/openapi.json',
    ...options,
  })
}

/**
 * List all clients
 * List all registered clients in ToolHive
 */
export const getApiV1BetaClients = <ThrowOnError extends boolean = false>(
  options?: Options<GetApiV1BetaClientsData, ThrowOnError>
) => {
  return (options?.client ?? _heyApiClient).get<
    GetApiV1BetaClientsResponses,
    unknown,
    ThrowOnError
  >({
    url: '/api/v1beta/clients',
    ...options,
  })
}

/**
 * Register a new client
 * Register a new client with ToolHive
 */
export const postApiV1BetaClients = <ThrowOnError extends boolean = false>(
  options: Options<PostApiV1BetaClientsData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaClientsResponses,
    PostApiV1BetaClientsErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/clients',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Register multiple clients
 * Register multiple clients with ToolHive
 */
export const postApiV1BetaClientsRegister = <
  ThrowOnError extends boolean = false,
>(
  options: Options<PostApiV1BetaClientsRegisterData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaClientsRegisterResponses,
    PostApiV1BetaClientsRegisterErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/clients/register',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Unregister multiple clients
 * Unregister multiple clients from ToolHive
 */
export const postApiV1BetaClientsUnregister = <
  ThrowOnError extends boolean = false,
>(
  options: Options<PostApiV1BetaClientsUnregisterData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaClientsUnregisterResponses,
    PostApiV1BetaClientsUnregisterErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/clients/unregister',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Unregister a client
 * Unregister a client from ToolHive
 */
export const deleteApiV1BetaClientsByName = <
  ThrowOnError extends boolean = false,
>(
  options: Options<DeleteApiV1BetaClientsByNameData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).delete<
    DeleteApiV1BetaClientsByNameResponses,
    DeleteApiV1BetaClientsByNameErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/clients/{name}',
    ...options,
  })
}

/**
 * List all clients status
 * List all clients compatible with ToolHive and their status
 */
export const getApiV1BetaDiscoveryClients = <
  ThrowOnError extends boolean = false,
>(
  options?: Options<GetApiV1BetaDiscoveryClientsData, ThrowOnError>
) => {
  return (options?.client ?? _heyApiClient).get<
    GetApiV1BetaDiscoveryClientsResponses,
    unknown,
    ThrowOnError
  >({
    url: '/api/v1beta/discovery/clients',
    ...options,
  })
}

/**
 * List all groups
 * Get a list of all groups
 */
export const getApiV1BetaGroups = <ThrowOnError extends boolean = false>(
  options?: Options<GetApiV1BetaGroupsData, ThrowOnError>
) => {
  return (options?.client ?? _heyApiClient).get<
    GetApiV1BetaGroupsResponses,
    GetApiV1BetaGroupsErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/groups',
    ...options,
  })
}

/**
 * Create a new group
 * Create a new group with the specified name
 */
export const postApiV1BetaGroups = <ThrowOnError extends boolean = false>(
  options: Options<PostApiV1BetaGroupsData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaGroupsResponses,
    PostApiV1BetaGroupsErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/groups',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Delete a group
 * Delete a group by name.
 */
export const deleteApiV1BetaGroupsByName = <
  ThrowOnError extends boolean = false,
>(
  options: Options<DeleteApiV1BetaGroupsByNameData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).delete<
    DeleteApiV1BetaGroupsByNameResponses,
    DeleteApiV1BetaGroupsByNameErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/groups/{name}',
    ...options,
  })
}

/**
 * Get group details
 * Get details of a specific group
 */
export const getApiV1BetaGroupsByName = <ThrowOnError extends boolean = false>(
  options: Options<GetApiV1BetaGroupsByNameData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).get<
    GetApiV1BetaGroupsByNameResponses,
    GetApiV1BetaGroupsByNameErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/groups/{name}',
    ...options,
  })
}

/**
 * List registries
 * Get a list of the current registries
 */
export const getApiV1BetaRegistry = <ThrowOnError extends boolean = false>(
  options?: Options<GetApiV1BetaRegistryData, ThrowOnError>
) => {
  return (options?.client ?? _heyApiClient).get<
    GetApiV1BetaRegistryResponses,
    unknown,
    ThrowOnError
  >({
    url: '/api/v1beta/registry',
    ...options,
  })
}

/**
 * Add a registry
 * Add a new registry
 */
export const postApiV1BetaRegistry = <ThrowOnError extends boolean = false>(
  options?: Options<PostApiV1BetaRegistryData, ThrowOnError>
) => {
  return (options?.client ?? _heyApiClient).post<
    unknown,
    PostApiV1BetaRegistryErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/registry',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
}

/**
 * Remove a registry
 * Remove a specific registry
 */
export const deleteApiV1BetaRegistryByName = <
  ThrowOnError extends boolean = false,
>(
  options: Options<DeleteApiV1BetaRegistryByNameData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).delete<
    DeleteApiV1BetaRegistryByNameResponses,
    DeleteApiV1BetaRegistryByNameErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/registry/{name}',
    ...options,
  })
}

/**
 * Get a registry
 * Get details of a specific registry
 */
export const getApiV1BetaRegistryByName = <
  ThrowOnError extends boolean = false,
>(
  options: Options<GetApiV1BetaRegistryByNameData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).get<
    GetApiV1BetaRegistryByNameResponses,
    GetApiV1BetaRegistryByNameErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/registry/{name}',
    ...options,
  })
}

/**
 * List servers in a registry
 * Get a list of servers in a specific registry
 */
export const getApiV1BetaRegistryByNameServers = <
  ThrowOnError extends boolean = false,
>(
  options: Options<GetApiV1BetaRegistryByNameServersData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).get<
    GetApiV1BetaRegistryByNameServersResponses,
    GetApiV1BetaRegistryByNameServersErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/registry/{name}/servers',
    ...options,
  })
}

/**
 * Get a server from a registry
 * Get details of a specific server in a registry
 */
export const getApiV1BetaRegistryByNameServersByServerName = <
  ThrowOnError extends boolean = false,
>(
  options: Options<
    GetApiV1BetaRegistryByNameServersByServerNameData,
    ThrowOnError
  >
) => {
  return (options.client ?? _heyApiClient).get<
    GetApiV1BetaRegistryByNameServersByServerNameResponses,
    GetApiV1BetaRegistryByNameServersByServerNameErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/registry/{name}/servers/{serverName}',
    ...options,
  })
}

/**
 * Setup or reconfigure secrets provider
 * Setup the secrets provider with the specified type and configuration.
 */
export const postApiV1BetaSecrets = <ThrowOnError extends boolean = false>(
  options: Options<PostApiV1BetaSecretsData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaSecretsResponses,
    PostApiV1BetaSecretsErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/secrets',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Get secrets provider details
 * Get details of the default secrets provider
 */
export const getApiV1BetaSecretsDefault = <
  ThrowOnError extends boolean = false,
>(
  options?: Options<GetApiV1BetaSecretsDefaultData, ThrowOnError>
) => {
  return (options?.client ?? _heyApiClient).get<
    GetApiV1BetaSecretsDefaultResponses,
    GetApiV1BetaSecretsDefaultErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/secrets/default',
    ...options,
  })
}

/**
 * List secrets
 * Get a list of all secret keys from the default provider
 */
export const getApiV1BetaSecretsDefaultKeys = <
  ThrowOnError extends boolean = false,
>(
  options?: Options<GetApiV1BetaSecretsDefaultKeysData, ThrowOnError>
) => {
  return (options?.client ?? _heyApiClient).get<
    GetApiV1BetaSecretsDefaultKeysResponses,
    GetApiV1BetaSecretsDefaultKeysErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/secrets/default/keys',
    ...options,
  })
}

/**
 * Create a new secret
 * Create a new secret in the default provider (encrypted provider only)
 */
export const postApiV1BetaSecretsDefaultKeys = <
  ThrowOnError extends boolean = false,
>(
  options: Options<PostApiV1BetaSecretsDefaultKeysData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaSecretsDefaultKeysResponses,
    PostApiV1BetaSecretsDefaultKeysErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/secrets/default/keys',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Delete a secret
 * Delete a secret from the default provider (encrypted provider only)
 */
export const deleteApiV1BetaSecretsDefaultKeysByKey = <
  ThrowOnError extends boolean = false,
>(
  options: Options<DeleteApiV1BetaSecretsDefaultKeysByKeyData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).delete<
    DeleteApiV1BetaSecretsDefaultKeysByKeyResponses,
    DeleteApiV1BetaSecretsDefaultKeysByKeyErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/secrets/default/keys/{key}',
    ...options,
  })
}

/**
 * Update a secret
 * Update an existing secret in the default provider (encrypted provider only)
 */
export const putApiV1BetaSecretsDefaultKeysByKey = <
  ThrowOnError extends boolean = false,
>(
  options: Options<PutApiV1BetaSecretsDefaultKeysByKeyData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).put<
    PutApiV1BetaSecretsDefaultKeysByKeyResponses,
    PutApiV1BetaSecretsDefaultKeysByKeyErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/secrets/default/keys/{key}',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Get server version
 * Returns the current version of the server
 */
export const getApiV1BetaVersion = <ThrowOnError extends boolean = false>(
  options?: Options<GetApiV1BetaVersionData, ThrowOnError>
) => {
  return (options?.client ?? _heyApiClient).get<
    GetApiV1BetaVersionResponses,
    unknown,
    ThrowOnError
  >({
    url: '/api/v1beta/version',
    ...options,
  })
}

/**
 * List all workloads
 * Get a list of all running workloads, optionally filtered by group
 */
export const getApiV1BetaWorkloads = <ThrowOnError extends boolean = false>(
  options?: Options<GetApiV1BetaWorkloadsData, ThrowOnError>
) => {
  return (options?.client ?? _heyApiClient).get<
    GetApiV1BetaWorkloadsResponses,
    GetApiV1BetaWorkloadsErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/workloads',
    ...options,
  })
}

/**
 * Create a new workload
 * Create and start a new workload
 */
export const postApiV1BetaWorkloads = <ThrowOnError extends boolean = false>(
  options: Options<PostApiV1BetaWorkloadsData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaWorkloadsResponses,
    PostApiV1BetaWorkloadsErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/workloads',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Delete workloads in bulk
 * Delete multiple workloads by name or by group
 */
export const postApiV1BetaWorkloadsDelete = <
  ThrowOnError extends boolean = false,
>(
  options: Options<PostApiV1BetaWorkloadsDeleteData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaWorkloadsDeleteResponses,
    PostApiV1BetaWorkloadsDeleteErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/workloads/delete',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Restart workloads in bulk
 * Restart multiple workloads by name or by group
 */
export const postApiV1BetaWorkloadsRestart = <
  ThrowOnError extends boolean = false,
>(
  options: Options<PostApiV1BetaWorkloadsRestartData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaWorkloadsRestartResponses,
    PostApiV1BetaWorkloadsRestartErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/workloads/restart',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Stop workloads in bulk
 * Stop multiple workloads by name or by group
 */
export const postApiV1BetaWorkloadsStop = <
  ThrowOnError extends boolean = false,
>(
  options: Options<PostApiV1BetaWorkloadsStopData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaWorkloadsStopResponses,
    PostApiV1BetaWorkloadsStopErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/workloads/stop',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Delete a workload
 * Delete a workload
 */
export const deleteApiV1BetaWorkloadsByName = <
  ThrowOnError extends boolean = false,
>(
  options: Options<DeleteApiV1BetaWorkloadsByNameData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).delete<
    DeleteApiV1BetaWorkloadsByNameResponses,
    DeleteApiV1BetaWorkloadsByNameErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/workloads/{name}',
    ...options,
  })
}

/**
 * Get workload details
 * Get details of a specific workload
 */
export const getApiV1BetaWorkloadsByName = <
  ThrowOnError extends boolean = false,
>(
  options: Options<GetApiV1BetaWorkloadsByNameData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).get<
    GetApiV1BetaWorkloadsByNameResponses,
    GetApiV1BetaWorkloadsByNameErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/workloads/{name}',
    ...options,
  })
}

/**
 * Export workload configuration
 * Export a workload's run configuration as JSON
 */
export const getApiV1BetaWorkloadsByNameExport = <
  ThrowOnError extends boolean = false,
>(
  options: Options<GetApiV1BetaWorkloadsByNameExportData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).get<
    GetApiV1BetaWorkloadsByNameExportResponses,
    GetApiV1BetaWorkloadsByNameExportErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/workloads/{name}/export',
    ...options,
  })
}

/**
 * Get logs for a specific workload
 * Retrieve at most 100 lines of logs for a specific workload by name.
 */
export const getApiV1BetaWorkloadsByNameLogs = <
  ThrowOnError extends boolean = false,
>(
  options: Options<GetApiV1BetaWorkloadsByNameLogsData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).get<
    GetApiV1BetaWorkloadsByNameLogsResponses,
    GetApiV1BetaWorkloadsByNameLogsErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/workloads/{name}/logs',
    ...options,
  })
}

/**
 * Restart a workload
 * Restart a running workload
 */
export const postApiV1BetaWorkloadsByNameRestart = <
  ThrowOnError extends boolean = false,
>(
  options: Options<PostApiV1BetaWorkloadsByNameRestartData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaWorkloadsByNameRestartResponses,
    PostApiV1BetaWorkloadsByNameRestartErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/workloads/{name}/restart',
    ...options,
  })
}

/**
 * Stop a workload
 * Stop a running workload
 */
export const postApiV1BetaWorkloadsByNameStop = <
  ThrowOnError extends boolean = false,
>(
  options: Options<PostApiV1BetaWorkloadsByNameStopData, ThrowOnError>
) => {
  return (options.client ?? _heyApiClient).post<
    PostApiV1BetaWorkloadsByNameStopResponses,
    PostApiV1BetaWorkloadsByNameStopErrors,
    ThrowOnError
  >({
    url: '/api/v1beta/workloads/{name}/stop',
    ...options,
  })
}

/**
 * Health check
 * Check if the API is healthy
 */
export const getHealth = <ThrowOnError extends boolean = false>(
  options?: Options<GetHealthData, ThrowOnError>
) => {
  return (options?.client ?? _heyApiClient).get<
    GetHealthResponses,
    unknown,
    ThrowOnError
  >({
    url: '/health',
    ...options,
  })
}
