import type { V1CreateRequest } from '@api/types.gen'
import {
  REMOTE_MCP_AUTH_TYPES,
  type RemoteMcpAuthType,
} from '../../form-schema-mcp'

export const getRemoteAuthFieldType = (
  oauthConfig?: V1CreateRequest['oauth_config']
): RemoteMcpAuthType => {
  if (!oauthConfig) return REMOTE_MCP_AUTH_TYPES.None
  if (oauthConfig.bearer_token) return REMOTE_MCP_AUTH_TYPES.BearerToken
  if (oauthConfig.authorize_url) return REMOTE_MCP_AUTH_TYPES.OAuth2
  if (oauthConfig.issuer) return REMOTE_MCP_AUTH_TYPES.OIDC
  return REMOTE_MCP_AUTH_TYPES.None
}
