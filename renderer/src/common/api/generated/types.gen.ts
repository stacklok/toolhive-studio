// This file is auto-generated by @hey-api/openapi-ts

export type ClientClient = {
  name?: ClientMcpClient
}

export type ClientMcpClient = string

export type ClientMcpClientStatus = {
  /**
   * ClientType is the type of MCP client
   */
  client_type?: string
  /**
   * Installed indicates whether the client is installed on the system
   */
  installed?: boolean
  /**
   * Registered indicates whether the client is registered in the ToolHive configuration
   */
  registered?: boolean
}

/**
 * Network defines network permissions
 */
export type PermissionsNetworkPermissions = {
  outbound?: PermissionsOutboundNetworkPermissions
}

/**
 * Outbound defines outbound network permissions
 */
export type PermissionsOutboundNetworkPermissions = {
  /**
   * AllowHost is a list of allowed hosts
   */
  allow_host?: Array<string>
  /**
   * AllowPort is a list of allowed ports
   */
  allow_port?: Array<number>
  /**
   * InsecureAllowAll allows all outbound network connections
   */
  insecure_allow_all?: boolean
}

/**
 * Permission profile to apply
 */
export type PermissionsProfile = {
  /**
   * Name is the name of the profile
   */
  name?: string
  network?: PermissionsNetworkPermissions
  /**
   * Read is a list of mount declarations that the container can read from
   * These can be in the following formats:
   * - A single path: The same path will be mounted from host to container
   * - host-path:container-path: Different paths for host and container
   * - resource-uri:container-path: Mount a resource identified by URI to a container path
   */
  read?: Array<string>
  /**
   * Write is a list of mount declarations that the container can write to
   * These follow the same format as Read mounts but with write permissions
   */
  write?: Array<string>
}

export type RegistryEnvVar = {
  /**
   * Default is the value to use if the environment variable is not explicitly provided
   * Only used for non-required variables
   */
  default?: string
  /**
   * Description is a human-readable explanation of the variable's purpose
   */
  description?: string
  /**
   * Name is the environment variable name (e.g., API_KEY)
   */
  name?: string
  /**
   * Required indicates whether this environment variable must be provided
   * If true and not provided via command line or secrets, the user will be prompted for a value
   */
  required?: boolean
  /**
   * Secret indicates whether this environment variable contains sensitive information
   * If true, the value will be stored as a secret rather than as a plain environment variable
   */
  secret?: boolean
}

/**
 * Server details
 */
export type RegistryImageMetadata = {
  /**
   * Args are the default command-line arguments to pass to the MCP server container.
   * These arguments will be prepended to any command-line arguments provided by the user.
   */
  args?: Array<string>
  /**
   * CustomMetadata allows for additional user-defined metadata
   */
  custom_metadata?: {
    [key: string]: unknown
  }
  /**
   * Description is a human-readable description of the server's purpose and functionality
   */
  description?: string
  /**
   * DockerTags lists the available Docker tags for this server image
   */
  docker_tags?: Array<string>
  /**
   * EnvVars defines environment variables that can be passed to the server
   */
  env_vars?: Array<RegistryEnvVar>
  /**
   * Image is the Docker image reference for the MCP server
   */
  image?: string
  metadata?: RegistryMetadata
  /**
   * Name is the identifier for the MCP server, used when referencing the server in commands
   * If not provided, it will be auto-generated from the image name
   */
  name?: string
  permissions?: PermissionsProfile
  provenance?: RegistryProvenance
  /**
   * RepositoryURL is the URL to the source code repository for the server
   */
  repository_url?: string
  /**
   * The Status indicates whether the server is currently active or deprecated
   */
  status?: string
  /**
   * Tags are categorization labels for the server to aid in discovery and filtering
   */
  tags?: Array<string>
  /**
   * TargetPort is the port for the container to expose (only applicable to SSE and Streamable HTTP transports)
   */
  target_port?: number
  /**
   * Tier represents the tier classification level of the server, e.g., "official" or "community" driven
   */
  tier?: string
  /**
   * Tools is a list of tool names provided by this MCP server
   */
  tools?: Array<string>
  /**
   * Transport defines the communication protocol for the server (stdio, sse, or streamable-http)
   */
  transport?: string
}

/**
 * Metadata contains additional information about the server such as popularity metrics
 */
export type RegistryMetadata = {
  /**
   * LastUpdated is the timestamp when the server was last updated, in RFC3339 format
   */
  last_updated?: string
  /**
   * Pulls indicates how many times the server image has been downloaded
   */
  pulls?: number
  /**
   * Stars represents the popularity rating or number of stars for the server
   */
  stars?: number
}

/**
 * Provenance contains verification and signing metadata
 */
export type RegistryProvenance = {
  attestation?: RegistryVerifiedAttestation
  cert_issuer?: string
  repository_ref?: string
  repository_uri?: string
  runner_environment?: string
  signer_identity?: string
  sigstore_url?: string
}

/**
 * Full registry data
 */
export type RegistryRegistry = {
  /**
   * LastUpdated is the timestamp when the registry was last updated, in RFC3339 format
   */
  last_updated?: string
  /**
   * Servers is a map of server names to their corresponding server definitions
   */
  servers?: {
    [key: string]: RegistryImageMetadata
  }
  /**
   * Version is the schema version of the registry
   */
  version?: string
}

export type RegistryVerifiedAttestation = {
  predicate?: unknown
  predicate_type?: string
}

export type SecretsSecretParameter = {
  name?: string
  target?: string
}

/**
 * TransportType is the type of transport used for this workload.
 */
export type TypesTransportType = string

export type V1BulkClientRequest = {
  /**
   * Names is the list of client names to operate on.
   */
  names?: Array<string>
}

/**
 * Request to perform bulk operations on workloads
 */
export type V1BulkOperationRequest = {
  /**
   * Names of the workloads to operate on
   */
  names?: Array<string>
}

export type V1ClientStatusResponse = {
  clients?: Array<ClientMcpClientStatus>
}

export type V1CreateClientRequest = {
  /**
   * Name is the type of the client to register.
   */
  name?: string
}

export type V1CreateClientResponse = {
  /**
   * Name is the type of the client that was registered.
   */
  name?: string
}

/**
 * Request to create a new workload
 */
export type V1CreateRequest = {
  /**
   * Authorization configuration
   */
  authz_config?: string
  /**
   * Command arguments to pass to the container
   */
  cmd_arguments?: Array<string>
  /**
   * Environment variables to set in the container
   */
  env_vars?: Array<string>
  /**
   * Host to bind to
   */
  host?: string
  /**
   * Docker image to use
   */
  image?: string
  /**
   * Name of the workload
   */
  name?: string
  /**
   * Whether network isolation is turned on. This applies the rules in the permission profile.
   */
  network_isolation?: boolean
  oidc?: V1OidcOptions
  permission_profile?: PermissionsProfile
  /**
   * Proxy mode to use
   */
  proxy_mode?: string
  /**
   * Secret parameters to inject
   */
  secrets?: Array<SecretsSecretParameter>
  /**
   * Port to expose from the container
   */
  target_port?: number
  /**
   * Transport configuration
   */
  transport?: string
  /**
   * Volume mounts
   */
  volumes?: Array<string>
}

/**
 * Request to create a new secret
 */
export type V1CreateSecretRequest = {
  /**
   * Secret key name
   */
  key?: string
  /**
   * Secret value
   */
  value?: string
}

/**
 * Response after creating a secret
 */
export type V1CreateSecretResponse = {
  /**
   * Secret key that was created
   */
  key?: string
  /**
   * Success message
   */
  message?: string
}

/**
 * Response after successfully creating a workload
 */
export type V1CreateWorkloadResponse = {
  /**
   * Name of the created workload
   */
  name?: string
  /**
   * Port the workload is listening on
   */
  port?: number
}

/**
 * Response containing registry details
 */
export type V1GetRegistryResponse = {
  /**
   * Last updated timestamp
   */
  last_updated?: string
  /**
   * Name of the registry
   */
  name?: string
  registry?: RegistryRegistry
  /**
   * Number of servers in the registry
   */
  server_count?: number
  /**
   * Version of the registry schema
   */
  version?: string
}

/**
 * Response containing secrets provider details
 */
export type V1GetSecretsProviderResponse = {
  capabilities?: V1ProviderCapabilitiesResponse
  /**
   * Name of the secrets provider
   */
  name?: string
  /**
   * Type of the secrets provider
   */
  provider_type?: string
}

/**
 * Response containing server details
 */
export type V1GetServerResponse = {
  server?: RegistryImageMetadata
}

/**
 * Response containing a list of secret keys
 */
export type V1ListSecretsResponse = {
  /**
   * List of secret keys
   */
  keys?: Array<V1SecretKeyResponse>
}

/**
 * Response containing a list of servers
 */
export type V1ListServersResponse = {
  /**
   * List of servers in the registry
   */
  servers?: Array<RegistryImageMetadata>
}

/**
 * OIDC configuration options
 */
export type V1OidcOptions = {
  /**
   * Allow opaque tokens (non-JWT) for OIDC validation
   */
  allow_opaque_tokens?: boolean
  /**
   * Expected audience
   */
  audience?: string
  /**
   * OAuth2 client ID
   */
  client_id?: string
  /**
   * OIDC issuer URL
   */
  issuer?: string
  /**
   * JWKS URL for key verification
   */
  jwks_url?: string
}

/**
 * Capabilities of the secrets provider
 */
export type V1ProviderCapabilitiesResponse = {
  /**
   * Whether the provider can cleanup all secrets
   */
  can_cleanup?: boolean
  /**
   * Whether the provider can delete secrets
   */
  can_delete?: boolean
  /**
   * Whether the provider can list secrets
   */
  can_list?: boolean
  /**
   * Whether the provider can read secrets
   */
  can_read?: boolean
  /**
   * Whether the provider can write secrets
   */
  can_write?: boolean
}

/**
 * Basic information about a registry
 */
export type V1RegistryInfo = {
  /**
   * Last updated timestamp
   */
  last_updated?: string
  /**
   * Name of the registry
   */
  name?: string
  /**
   * Number of servers in the registry
   */
  server_count?: number
  /**
   * Version of the registry schema
   */
  version?: string
}

/**
 * Response containing a list of registries
 */
export type V1RegistryListResponse = {
  /**
   * List of registries
   */
  registries?: Array<V1RegistryInfo>
}

/**
 * Secret key information
 */
export type V1SecretKeyResponse = {
  /**
   * Optional description of the secret
   */
  description?: string
  /**
   * Secret key name
   */
  key?: string
}

/**
 * Request to setup a secrets provider
 */
export type V1SetupSecretsRequest = {
  /**
   * Password for encrypted provider (optional, can be set via environment variable)
   * TODO Review environment variable for this
   */
  password?: string
  /**
   * Type of the secrets provider (encrypted, 1password, none)
   */
  provider_type?: string
}

/**
 * Response after initializing a secrets provider
 */
export type V1SetupSecretsResponse = {
  /**
   * Success message
   */
  message?: string
  /**
   * Type of the secrets provider that was setup
   */
  provider_type?: string
}

/**
 * Request to update an existing secret
 */
export type V1UpdateSecretRequest = {
  /**
   * New secret value
   */
  value?: string
}

/**
 * Response after updating a secret
 */
export type V1UpdateSecretResponse = {
  /**
   * Secret key that was updated
   */
  key?: string
  /**
   * Success message
   */
  message?: string
}

export type V1VersionResponse = {
  version?: string
}

/**
 * Response containing a list of workloads
 */
export type V1WorkloadListResponse = {
  /**
   * List of container information for each workload
   */
  workloads?: Array<WorkloadsWorkload>
}

export type WorkloadsWorkload = {
  /**
   * CreatedAt is the timestamp when the workload was created.
   */
  created_at?: string
  /**
   * Labels are the container labels (excluding standard ToolHive labels)
   */
  labels?: {
    [key: string]: string
  }
  /**
   * Name is the name of the workload.
   * It is used as a unique identifier.
   */
  name?: string
  /**
   * Package specifies the Workload Package used to create this Workload.
   */
  package?: string
  /**
   * Port is the port on which the workload is exposed.
   * This is embedded in the URL.
   */
  port?: number
  status?: WorkloadsWorkloadStatus
  /**
   * StatusContext provides additional context about the workload's status.
   * The exact meaning is determined by the status and the underlying runtime.
   */
  status_context?: string
  /**
   * ToolType is the type of tool this workload represents.
   * For now, it will always be "mcp" - representing an MCP server.
   */
  tool_type?: string
  transport_type?: TypesTransportType
  /**
   * URL is the URL of the workload exposed by the ToolHive proxy.
   */
  url?: string
}

/**
 * Status is the current status of the workload.
 */
export type WorkloadsWorkloadStatus = string

export type GetApiOpenapiJsonData = {
  body?: never
  path?: never
  query?: never
  url: '/api/openapi.json'
}

export type GetApiOpenapiJsonResponses = {
  /**
   * OpenAPI specification
   */
  200: {
    [key: string]: unknown
  }
}

export type GetApiOpenapiJsonResponse =
  GetApiOpenapiJsonResponses[keyof GetApiOpenapiJsonResponses]

export type GetApiV1BetaClientsData = {
  body?: never
  path?: never
  query?: never
  url: '/api/v1beta/clients'
}

export type GetApiV1BetaClientsResponses = {
  /**
   * OK
   */
  200: Array<ClientClient>
}

export type GetApiV1BetaClientsResponse =
  GetApiV1BetaClientsResponses[keyof GetApiV1BetaClientsResponses]

export type PostApiV1BetaClientsData = {
  /**
   * Client to register
   */
  body: V1CreateClientRequest
  path?: never
  query?: never
  url: '/api/v1beta/clients'
}

export type PostApiV1BetaClientsErrors = {
  /**
   * Invalid request
   */
  400: string
}

export type PostApiV1BetaClientsError =
  PostApiV1BetaClientsErrors[keyof PostApiV1BetaClientsErrors]

export type PostApiV1BetaClientsResponses = {
  /**
   * OK
   */
  200: V1CreateClientResponse
}

export type PostApiV1BetaClientsResponse =
  PostApiV1BetaClientsResponses[keyof PostApiV1BetaClientsResponses]

export type PostApiV1BetaClientsRegisterData = {
  /**
   * Clients to register
   */
  body: V1BulkClientRequest
  path?: never
  query?: never
  url: '/api/v1beta/clients/register'
}

export type PostApiV1BetaClientsRegisterErrors = {
  /**
   * Invalid request
   */
  400: string
}

export type PostApiV1BetaClientsRegisterError =
  PostApiV1BetaClientsRegisterErrors[keyof PostApiV1BetaClientsRegisterErrors]

export type PostApiV1BetaClientsRegisterResponses = {
  /**
   * OK
   */
  200: Array<V1CreateClientResponse>
}

export type PostApiV1BetaClientsRegisterResponse =
  PostApiV1BetaClientsRegisterResponses[keyof PostApiV1BetaClientsRegisterResponses]

export type PostApiV1BetaClientsUnregisterData = {
  /**
   * Clients to unregister
   */
  body: V1BulkClientRequest
  path?: never
  query?: never
  url: '/api/v1beta/clients/unregister'
}

export type PostApiV1BetaClientsUnregisterErrors = {
  /**
   * Invalid request
   */
  400: string
}

export type PostApiV1BetaClientsUnregisterError =
  PostApiV1BetaClientsUnregisterErrors[keyof PostApiV1BetaClientsUnregisterErrors]

export type PostApiV1BetaClientsUnregisterResponses = {
  /**
   * No Content
   */
  204: void
}

export type PostApiV1BetaClientsUnregisterResponse =
  PostApiV1BetaClientsUnregisterResponses[keyof PostApiV1BetaClientsUnregisterResponses]

export type DeleteApiV1BetaClientsByNameData = {
  body?: never
  path: {
    /**
     * Client name to unregister
     */
    name: string
  }
  query?: never
  url: '/api/v1beta/clients/{name}'
}

export type DeleteApiV1BetaClientsByNameErrors = {
  /**
   * Invalid request
   */
  400: string
}

export type DeleteApiV1BetaClientsByNameError =
  DeleteApiV1BetaClientsByNameErrors[keyof DeleteApiV1BetaClientsByNameErrors]

export type DeleteApiV1BetaClientsByNameResponses = {
  /**
   * No Content
   */
  204: void
}

export type DeleteApiV1BetaClientsByNameResponse =
  DeleteApiV1BetaClientsByNameResponses[keyof DeleteApiV1BetaClientsByNameResponses]

export type GetApiV1BetaDiscoveryClientsData = {
  body?: never
  path?: never
  query?: never
  url: '/api/v1beta/discovery/clients'
}

export type GetApiV1BetaDiscoveryClientsResponses = {
  /**
   * OK
   */
  200: V1ClientStatusResponse
}

export type GetApiV1BetaDiscoveryClientsResponse =
  GetApiV1BetaDiscoveryClientsResponses[keyof GetApiV1BetaDiscoveryClientsResponses]

export type GetApiV1BetaRegistryData = {
  body?: never
  path?: never
  query?: never
  url: '/api/v1beta/registry'
}

export type GetApiV1BetaRegistryResponses = {
  /**
   * OK
   */
  200: V1RegistryListResponse
}

export type GetApiV1BetaRegistryResponse =
  GetApiV1BetaRegistryResponses[keyof GetApiV1BetaRegistryResponses]

export type PostApiV1BetaRegistryData = {
  body?: {
    [key: string]: unknown
  }
  path?: never
  query?: never
  url: '/api/v1beta/registry'
}

export type PostApiV1BetaRegistryErrors = {
  /**
   * Not Implemented
   */
  501: string
}

export type PostApiV1BetaRegistryError =
  PostApiV1BetaRegistryErrors[keyof PostApiV1BetaRegistryErrors]

export type DeleteApiV1BetaRegistryByNameData = {
  body?: never
  path: {
    /**
     * Registry name
     */
    name: string
  }
  query?: never
  url: '/api/v1beta/registry/{name}'
}

export type DeleteApiV1BetaRegistryByNameErrors = {
  /**
   * Not Found
   */
  404: string
}

export type DeleteApiV1BetaRegistryByNameError =
  DeleteApiV1BetaRegistryByNameErrors[keyof DeleteApiV1BetaRegistryByNameErrors]

export type DeleteApiV1BetaRegistryByNameResponses = {
  /**
   * No Content
   */
  204: string
}

export type DeleteApiV1BetaRegistryByNameResponse =
  DeleteApiV1BetaRegistryByNameResponses[keyof DeleteApiV1BetaRegistryByNameResponses]

export type GetApiV1BetaRegistryByNameData = {
  body?: never
  path: {
    /**
     * Registry name
     */
    name: string
  }
  query?: never
  url: '/api/v1beta/registry/{name}'
}

export type GetApiV1BetaRegistryByNameErrors = {
  /**
   * Not Found
   */
  404: string
}

export type GetApiV1BetaRegistryByNameError =
  GetApiV1BetaRegistryByNameErrors[keyof GetApiV1BetaRegistryByNameErrors]

export type GetApiV1BetaRegistryByNameResponses = {
  /**
   * OK
   */
  200: V1GetRegistryResponse
}

export type GetApiV1BetaRegistryByNameResponse =
  GetApiV1BetaRegistryByNameResponses[keyof GetApiV1BetaRegistryByNameResponses]

export type GetApiV1BetaRegistryByNameServersData = {
  body?: never
  path: {
    /**
     * Registry name
     */
    name: string
  }
  query?: never
  url: '/api/v1beta/registry/{name}/servers'
}

export type GetApiV1BetaRegistryByNameServersErrors = {
  /**
   * Not Found
   */
  404: string
}

export type GetApiV1BetaRegistryByNameServersError =
  GetApiV1BetaRegistryByNameServersErrors[keyof GetApiV1BetaRegistryByNameServersErrors]

export type GetApiV1BetaRegistryByNameServersResponses = {
  /**
   * OK
   */
  200: V1ListServersResponse
}

export type GetApiV1BetaRegistryByNameServersResponse =
  GetApiV1BetaRegistryByNameServersResponses[keyof GetApiV1BetaRegistryByNameServersResponses]

export type GetApiV1BetaRegistryByNameServersByServerNameData = {
  body?: never
  path: {
    /**
     * Registry name
     */
    name: string
    /**
     * ImageMetadata name
     */
    serverName: string
  }
  query?: never
  url: '/api/v1beta/registry/{name}/servers/{serverName}'
}

export type GetApiV1BetaRegistryByNameServersByServerNameErrors = {
  /**
   * Not Found
   */
  404: string
}

export type GetApiV1BetaRegistryByNameServersByServerNameError =
  GetApiV1BetaRegistryByNameServersByServerNameErrors[keyof GetApiV1BetaRegistryByNameServersByServerNameErrors]

export type GetApiV1BetaRegistryByNameServersByServerNameResponses = {
  /**
   * OK
   */
  200: V1GetServerResponse
}

export type GetApiV1BetaRegistryByNameServersByServerNameResponse =
  GetApiV1BetaRegistryByNameServersByServerNameResponses[keyof GetApiV1BetaRegistryByNameServersByServerNameResponses]

export type PostApiV1BetaSecretsData = {
  /**
   * Setup secrets provider request
   */
  body: V1SetupSecretsRequest
  path?: never
  query?: never
  url: '/api/v1beta/secrets'
}

export type PostApiV1BetaSecretsErrors = {
  /**
   * Bad Request
   */
  400: string
  /**
   * Internal Server Error
   */
  500: string
}

export type PostApiV1BetaSecretsError =
  PostApiV1BetaSecretsErrors[keyof PostApiV1BetaSecretsErrors]

export type PostApiV1BetaSecretsResponses = {
  /**
   * Created
   */
  201: V1SetupSecretsResponse
}

export type PostApiV1BetaSecretsResponse =
  PostApiV1BetaSecretsResponses[keyof PostApiV1BetaSecretsResponses]

export type GetApiV1BetaSecretsDefaultData = {
  body?: never
  path?: never
  query?: never
  url: '/api/v1beta/secrets/default'
}

export type GetApiV1BetaSecretsDefaultErrors = {
  /**
   * Not Found - Provider not setup
   */
  404: string
  /**
   * Internal Server Error
   */
  500: string
}

export type GetApiV1BetaSecretsDefaultError =
  GetApiV1BetaSecretsDefaultErrors[keyof GetApiV1BetaSecretsDefaultErrors]

export type GetApiV1BetaSecretsDefaultResponses = {
  /**
   * OK
   */
  200: V1GetSecretsProviderResponse
}

export type GetApiV1BetaSecretsDefaultResponse =
  GetApiV1BetaSecretsDefaultResponses[keyof GetApiV1BetaSecretsDefaultResponses]

export type GetApiV1BetaSecretsDefaultKeysData = {
  body?: never
  path?: never
  query?: never
  url: '/api/v1beta/secrets/default/keys'
}

export type GetApiV1BetaSecretsDefaultKeysErrors = {
  /**
   * Not Found - Provider not setup
   */
  404: string
  /**
   * Method Not Allowed - Provider doesn't support listing
   */
  405: string
  /**
   * Internal Server Error
   */
  500: string
}

export type GetApiV1BetaSecretsDefaultKeysError =
  GetApiV1BetaSecretsDefaultKeysErrors[keyof GetApiV1BetaSecretsDefaultKeysErrors]

export type GetApiV1BetaSecretsDefaultKeysResponses = {
  /**
   * OK
   */
  200: V1ListSecretsResponse
}

export type GetApiV1BetaSecretsDefaultKeysResponse =
  GetApiV1BetaSecretsDefaultKeysResponses[keyof GetApiV1BetaSecretsDefaultKeysResponses]

export type PostApiV1BetaSecretsDefaultKeysData = {
  /**
   * Create secret request
   */
  body: V1CreateSecretRequest
  path?: never
  query?: never
  url: '/api/v1beta/secrets/default/keys'
}

export type PostApiV1BetaSecretsDefaultKeysErrors = {
  /**
   * Bad Request
   */
  400: string
  /**
   * Not Found - Provider not setup
   */
  404: string
  /**
   * Method Not Allowed - Provider doesn't support writing
   */
  405: string
  /**
   * Conflict - Secret already exists
   */
  409: string
  /**
   * Internal Server Error
   */
  500: string
}

export type PostApiV1BetaSecretsDefaultKeysError =
  PostApiV1BetaSecretsDefaultKeysErrors[keyof PostApiV1BetaSecretsDefaultKeysErrors]

export type PostApiV1BetaSecretsDefaultKeysResponses = {
  /**
   * Created
   */
  201: V1CreateSecretResponse
}

export type PostApiV1BetaSecretsDefaultKeysResponse =
  PostApiV1BetaSecretsDefaultKeysResponses[keyof PostApiV1BetaSecretsDefaultKeysResponses]

export type DeleteApiV1BetaSecretsDefaultKeysByKeyData = {
  body?: never
  path: {
    /**
     * Secret key
     */
    key: string
  }
  query?: never
  url: '/api/v1beta/secrets/default/keys/{key}'
}

export type DeleteApiV1BetaSecretsDefaultKeysByKeyErrors = {
  /**
   * Not Found - Provider not setup or secret not found
   */
  404: string
  /**
   * Method Not Allowed - Provider doesn't support deletion
   */
  405: string
  /**
   * Internal Server Error
   */
  500: string
}

export type DeleteApiV1BetaSecretsDefaultKeysByKeyError =
  DeleteApiV1BetaSecretsDefaultKeysByKeyErrors[keyof DeleteApiV1BetaSecretsDefaultKeysByKeyErrors]

export type DeleteApiV1BetaSecretsDefaultKeysByKeyResponses = {
  /**
   * No Content
   */
  204: string
}

export type DeleteApiV1BetaSecretsDefaultKeysByKeyResponse =
  DeleteApiV1BetaSecretsDefaultKeysByKeyResponses[keyof DeleteApiV1BetaSecretsDefaultKeysByKeyResponses]

export type PutApiV1BetaSecretsDefaultKeysByKeyData = {
  /**
   * Update secret request
   */
  body: V1UpdateSecretRequest
  path: {
    /**
     * Secret key
     */
    key: string
  }
  query?: never
  url: '/api/v1beta/secrets/default/keys/{key}'
}

export type PutApiV1BetaSecretsDefaultKeysByKeyErrors = {
  /**
   * Bad Request
   */
  400: string
  /**
   * Not Found - Provider not setup or secret not found
   */
  404: string
  /**
   * Method Not Allowed - Provider doesn't support writing
   */
  405: string
  /**
   * Internal Server Error
   */
  500: string
}

export type PutApiV1BetaSecretsDefaultKeysByKeyError =
  PutApiV1BetaSecretsDefaultKeysByKeyErrors[keyof PutApiV1BetaSecretsDefaultKeysByKeyErrors]

export type PutApiV1BetaSecretsDefaultKeysByKeyResponses = {
  /**
   * OK
   */
  200: V1UpdateSecretResponse
}

export type PutApiV1BetaSecretsDefaultKeysByKeyResponse =
  PutApiV1BetaSecretsDefaultKeysByKeyResponses[keyof PutApiV1BetaSecretsDefaultKeysByKeyResponses]

export type GetApiV1BetaVersionData = {
  body?: never
  path?: never
  query?: never
  url: '/api/v1beta/version'
}

export type GetApiV1BetaVersionResponses = {
  /**
   * OK
   */
  200: V1VersionResponse
}

export type GetApiV1BetaVersionResponse =
  GetApiV1BetaVersionResponses[keyof GetApiV1BetaVersionResponses]

export type GetApiV1BetaWorkloadsData = {
  body?: never
  path?: never
  query?: {
    /**
     * List all workloads, including stopped ones
     */
    all?: boolean
  }
  url: '/api/v1beta/workloads'
}

export type GetApiV1BetaWorkloadsResponses = {
  /**
   * OK
   */
  200: V1WorkloadListResponse
}

export type GetApiV1BetaWorkloadsResponse =
  GetApiV1BetaWorkloadsResponses[keyof GetApiV1BetaWorkloadsResponses]

export type PostApiV1BetaWorkloadsData = {
  /**
   * Create workload request
   */
  body: V1CreateRequest
  path?: never
  query?: never
  url: '/api/v1beta/workloads'
}

export type PostApiV1BetaWorkloadsErrors = {
  /**
   * Bad Request
   */
  400: string
  /**
   * Conflict
   */
  409: string
}

export type PostApiV1BetaWorkloadsError =
  PostApiV1BetaWorkloadsErrors[keyof PostApiV1BetaWorkloadsErrors]

export type PostApiV1BetaWorkloadsResponses = {
  /**
   * Created
   */
  201: V1CreateWorkloadResponse
}

export type PostApiV1BetaWorkloadsResponse =
  PostApiV1BetaWorkloadsResponses[keyof PostApiV1BetaWorkloadsResponses]

export type PostApiV1BetaWorkloadsDeleteData = {
  /**
   * Bulk delete request
   */
  body: V1BulkOperationRequest
  path?: never
  query?: never
  url: '/api/v1beta/workloads/delete'
}

export type PostApiV1BetaWorkloadsDeleteErrors = {
  /**
   * Bad Request
   */
  400: string
}

export type PostApiV1BetaWorkloadsDeleteError =
  PostApiV1BetaWorkloadsDeleteErrors[keyof PostApiV1BetaWorkloadsDeleteErrors]

export type PostApiV1BetaWorkloadsDeleteResponses = {
  /**
   * Accepted
   */
  202: string
}

export type PostApiV1BetaWorkloadsDeleteResponse =
  PostApiV1BetaWorkloadsDeleteResponses[keyof PostApiV1BetaWorkloadsDeleteResponses]

export type PostApiV1BetaWorkloadsRestartData = {
  /**
   * Bulk restart request
   */
  body: V1BulkOperationRequest
  path?: never
  query?: never
  url: '/api/v1beta/workloads/restart'
}

export type PostApiV1BetaWorkloadsRestartErrors = {
  /**
   * Bad Request
   */
  400: string
}

export type PostApiV1BetaWorkloadsRestartError =
  PostApiV1BetaWorkloadsRestartErrors[keyof PostApiV1BetaWorkloadsRestartErrors]

export type PostApiV1BetaWorkloadsRestartResponses = {
  /**
   * Accepted
   */
  202: string
}

export type PostApiV1BetaWorkloadsRestartResponse =
  PostApiV1BetaWorkloadsRestartResponses[keyof PostApiV1BetaWorkloadsRestartResponses]

export type PostApiV1BetaWorkloadsStopData = {
  /**
   * Bulk stop request
   */
  body: V1BulkOperationRequest
  path?: never
  query?: never
  url: '/api/v1beta/workloads/stop'
}

export type PostApiV1BetaWorkloadsStopErrors = {
  /**
   * Bad Request
   */
  400: string
}

export type PostApiV1BetaWorkloadsStopError =
  PostApiV1BetaWorkloadsStopErrors[keyof PostApiV1BetaWorkloadsStopErrors]

export type PostApiV1BetaWorkloadsStopResponses = {
  /**
   * Accepted
   */
  202: string
}

export type PostApiV1BetaWorkloadsStopResponse =
  PostApiV1BetaWorkloadsStopResponses[keyof PostApiV1BetaWorkloadsStopResponses]

export type DeleteApiV1BetaWorkloadsByNameData = {
  body?: never
  path: {
    /**
     * Workload name
     */
    name: string
  }
  query?: never
  url: '/api/v1beta/workloads/{name}'
}

export type DeleteApiV1BetaWorkloadsByNameErrors = {
  /**
   * Bad Request
   */
  400: string
  /**
   * Not Found
   */
  404: string
}

export type DeleteApiV1BetaWorkloadsByNameError =
  DeleteApiV1BetaWorkloadsByNameErrors[keyof DeleteApiV1BetaWorkloadsByNameErrors]

export type DeleteApiV1BetaWorkloadsByNameResponses = {
  /**
   * Accepted
   */
  202: string
}

export type DeleteApiV1BetaWorkloadsByNameResponse =
  DeleteApiV1BetaWorkloadsByNameResponses[keyof DeleteApiV1BetaWorkloadsByNameResponses]

export type GetApiV1BetaWorkloadsByNameData = {
  body?: never
  path: {
    /**
     * Workload name
     */
    name: string
  }
  query?: never
  url: '/api/v1beta/workloads/{name}'
}

export type GetApiV1BetaWorkloadsByNameErrors = {
  /**
   * Not Found
   */
  404: string
}

export type GetApiV1BetaWorkloadsByNameError =
  GetApiV1BetaWorkloadsByNameErrors[keyof GetApiV1BetaWorkloadsByNameErrors]

export type GetApiV1BetaWorkloadsByNameResponses = {
  /**
   * OK
   */
  200: WorkloadsWorkload
}

export type GetApiV1BetaWorkloadsByNameResponse =
  GetApiV1BetaWorkloadsByNameResponses[keyof GetApiV1BetaWorkloadsByNameResponses]

export type GetApiV1BetaWorkloadsByNameLogsData = {
  body?: never
  path: {
    /**
     * Workload name
     */
    name: string
  }
  query?: never
  url: '/api/v1beta/workloads/{name}/logs'
}

export type GetApiV1BetaWorkloadsByNameLogsErrors = {
  /**
   * Not Found
   */
  404: string
}

export type GetApiV1BetaWorkloadsByNameLogsError =
  GetApiV1BetaWorkloadsByNameLogsErrors[keyof GetApiV1BetaWorkloadsByNameLogsErrors]

export type GetApiV1BetaWorkloadsByNameLogsResponses = {
  /**
   * Logs for the specified workload
   */
  200: string
}

export type GetApiV1BetaWorkloadsByNameLogsResponse =
  GetApiV1BetaWorkloadsByNameLogsResponses[keyof GetApiV1BetaWorkloadsByNameLogsResponses]

export type PostApiV1BetaWorkloadsByNameRestartData = {
  body?: never
  path: {
    /**
     * Workload name
     */
    name: string
  }
  query?: never
  url: '/api/v1beta/workloads/{name}/restart'
}

export type PostApiV1BetaWorkloadsByNameRestartErrors = {
  /**
   * Bad Request
   */
  400: string
  /**
   * Not Found
   */
  404: string
}

export type PostApiV1BetaWorkloadsByNameRestartError =
  PostApiV1BetaWorkloadsByNameRestartErrors[keyof PostApiV1BetaWorkloadsByNameRestartErrors]

export type PostApiV1BetaWorkloadsByNameRestartResponses = {
  /**
   * Accepted
   */
  202: string
}

export type PostApiV1BetaWorkloadsByNameRestartResponse =
  PostApiV1BetaWorkloadsByNameRestartResponses[keyof PostApiV1BetaWorkloadsByNameRestartResponses]

export type PostApiV1BetaWorkloadsByNameStopData = {
  body?: never
  path: {
    /**
     * Workload name
     */
    name: string
  }
  query?: never
  url: '/api/v1beta/workloads/{name}/stop'
}

export type PostApiV1BetaWorkloadsByNameStopErrors = {
  /**
   * Bad Request
   */
  400: string
  /**
   * Not Found
   */
  404: string
}

export type PostApiV1BetaWorkloadsByNameStopError =
  PostApiV1BetaWorkloadsByNameStopErrors[keyof PostApiV1BetaWorkloadsByNameStopErrors]

export type PostApiV1BetaWorkloadsByNameStopResponses = {
  /**
   * Accepted
   */
  202: string
}

export type PostApiV1BetaWorkloadsByNameStopResponse =
  PostApiV1BetaWorkloadsByNameStopResponses[keyof PostApiV1BetaWorkloadsByNameStopResponses]

export type GetHealthData = {
  body?: never
  path?: never
  query?: never
  url: '/health'
}

export type GetHealthResponses = {
  /**
   * No Content
   */
  204: string
}

export type GetHealthResponse = GetHealthResponses[keyof GetHealthResponses]

export type ClientOptions = {
  baseUrl: `${string}://src` | (string & {})
}
