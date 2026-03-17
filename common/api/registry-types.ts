/**
 * Registry and permissions types removed from the generated OpenAPI types in
 * toolhive v0.10.2. The API still returns these fields; they were simply
 * removed from the spec. Kept here for backwards compatibility.
 */

import type {
  PkgApiV1GetRegistryResponse as BaseV1GetRegistryResponse,
  PkgApiV1GetServerResponse as BaseV1GetServerResponse,
  PkgApiV1ListServersResponse as BaseV1ListServersResponse,
  PkgApiV1CreateRequest as BaseV1CreateRequest,
  PkgApiV1UpdateRequest as BaseV1UpdateRequest,
} from './generated/types.gen'

export type PermissionsInboundNetworkPermissions = {
  allow_host?: Array<string>
}

export type PermissionsNetworkPermissions = {
  inbound?: PermissionsInboundNetworkPermissions
  mode?: string
  outbound?: PermissionsOutboundNetworkPermissions
}

export type PermissionsOutboundNetworkPermissions = {
  allow_host?: Array<string>
  allow_port?: Array<number>
  insecure_allow_all?: boolean
}

export type PermissionsProfile = {
  name?: string
  network?: PermissionsNetworkPermissions
  privileged?: boolean
  read?: Array<string>
  write?: Array<string>
}

export type RegistryEnvVar = {
  default?: string
  description?: string
  name?: string
  required?: boolean
  secret?: boolean
}

export type RegistryHeader = {
  choices?: Array<string>
  default?: string
  description?: string
  name?: string
  required?: boolean
  secret?: boolean
}

export type RegistryKubernetesMetadata = {
  image?: string
  kind?: string
  name?: string
  namespace?: string
  transport?: string
  uid?: string
}

export type RegistryMetadata = {
  kubernetes?: RegistryKubernetesMetadata
  last_updated?: string
  stars?: number
}

export type RegistryVerifiedAttestation = {
  predicate?: unknown
  predicate_type?: string
}

export type RegistryProvenance = {
  attestation?: RegistryVerifiedAttestation
  cert_issuer?: string
  repository_ref?: string
  repository_uri?: string
  runner_environment?: string
  signer_identity?: string
  sigstore_url?: string
}

export type RegistryOAuthConfig = {
  authorize_url?: string
  callback_port?: number
  client_id?: string
  issuer?: string
  oauth_params?: { [key: string]: string }
  resource?: string
  scopes?: Array<string>
  token_url?: string
  use_pkce?: boolean
}

export type RegistryImageMetadata = {
  args?: Array<string>
  custom_metadata?: { [key: string]: unknown }
  description?: string
  docker_tags?: Array<string>
  env_vars?: Array<RegistryEnvVar>
  image?: string
  metadata?: RegistryMetadata
  name?: string
  overview?: string
  permissions?: PermissionsProfile
  provenance?: RegistryProvenance
  proxy_port?: number
  repository_url?: string
  status?: string
  tags?: Array<string>
  target_port?: number
  tier?: string
  title?: string
  tools?: Array<string>
  transport?: string
  url?: string
}

export type RegistryRemoteServerMetadata = {
  custom_metadata?: { [key: string]: unknown }
  description?: string
  env_vars?: Array<RegistryEnvVar>
  headers?: Array<RegistryHeader>
  metadata?: RegistryMetadata
  name?: string
  oauth_config?: RegistryOAuthConfig
  overview?: string
  repository_url?: string
  status?: string
  tags?: Array<string>
  tier?: string
  title?: string
  tools?: Array<string>
  transport?: string
  url?: string
}

export type RegistryGroup = {
  description?: string
  name?: string
  remote_servers?: { [key: string]: RegistryRemoteServerMetadata }
  servers?: { [key: string]: RegistryImageMetadata }
}

export type RegistryRegistry = {
  groups?: Array<RegistryGroup>
  last_updated?: string
  remote_servers?: { [key: string]: RegistryRemoteServerMetadata }
  servers?: { [key: string]: RegistryImageMetadata }
  version?: string
}

// Extended versions of generated types that include registry fields
// removed from OpenAPI spec in v0.10.2 but still returned by the API.

export type V1GetRegistryResponse = BaseV1GetRegistryResponse & {
  registry?: RegistryRegistry
}

export type V1GetServerResponse = BaseV1GetServerResponse & {
  server?: RegistryImageMetadata
  remote_server?: RegistryRemoteServerMetadata
}

export type V1ListServersResponse = BaseV1ListServersResponse & {
  servers?: Array<RegistryImageMetadata>
  remote_servers?: Array<RegistryRemoteServerMetadata>
}

export type V1CreateRequest = BaseV1CreateRequest & {
  permission_profile?: PermissionsProfile
}

export type V1UpdateRequest = BaseV1UpdateRequest & {
  permission_profile?: PermissionsProfile
}
