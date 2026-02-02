import { describe, it, expect } from 'vitest'
import { getRemoteAuthFieldType } from '../form-fields-util-remote'
import { REMOTE_MCP_AUTH_TYPES } from '../../../form-schema-mcp'

describe('getRemoteAuthFieldType', () => {
  it('returns AutoDiscovered when oauthConfig is undefined', () => {
    expect(getRemoteAuthFieldType(undefined)).toBe(
      REMOTE_MCP_AUTH_TYPES.AutoDiscovered
    )
  })

  it('returns AutoDiscovered when oauthConfig is empty object', () => {
    expect(getRemoteAuthFieldType({})).toBe(
      REMOTE_MCP_AUTH_TYPES.AutoDiscovered
    )
  })

  it('returns BearerToken when bearer_token is present', () => {
    const config = {
      bearer_token: { name: 'token', target: 'TOKEN_SECRET' },
    }
    expect(getRemoteAuthFieldType(config)).toBe(
      REMOTE_MCP_AUTH_TYPES.BearerToken
    )
  })

  it('returns OAuth2 when authorize_url is present', () => {
    const config = {
      authorize_url: 'https://auth.example.com/authorize',
    }
    expect(getRemoteAuthFieldType(config)).toBe(REMOTE_MCP_AUTH_TYPES.OAuth2)
  })

  it('returns OIDC when issuer is present', () => {
    const config = {
      issuer: 'https://auth.example.com/',
    }
    expect(getRemoteAuthFieldType(config)).toBe(REMOTE_MCP_AUTH_TYPES.OIDC)
  })

  it('returns AutoDiscovered when only callback_port is present', () => {
    const config = {
      callback_port: 8080,
    }
    expect(getRemoteAuthFieldType(config)).toBe(
      REMOTE_MCP_AUTH_TYPES.AutoDiscovered
    )
  })

  describe('priority order (more specific auth types take precedence)', () => {
    it('returns OAuth2 when both authorize_url and callback_port are present', () => {
      const config = {
        authorize_url: 'https://auth.example.com/authorize',
        callback_port: 8080,
      }
      expect(getRemoteAuthFieldType(config)).toBe(REMOTE_MCP_AUTH_TYPES.OAuth2)
    })

    it('returns OIDC when both issuer and callback_port are present', () => {
      const config = {
        issuer: 'https://auth.example.com/',
        callback_port: 8080,
      }
      expect(getRemoteAuthFieldType(config)).toBe(REMOTE_MCP_AUTH_TYPES.OIDC)
    })

    it('returns BearerToken when bearer_token and callback_port are present', () => {
      const config = {
        bearer_token: { name: 'token', target: 'TOKEN_SECRET' },
        callback_port: 8080,
      }
      expect(getRemoteAuthFieldType(config)).toBe(
        REMOTE_MCP_AUTH_TYPES.BearerToken
      )
    })

    it('returns OAuth2 over OIDC when both authorize_url and issuer are present', () => {
      const config = {
        authorize_url: 'https://auth.example.com/authorize',
        issuer: 'https://auth.example.com/',
      }
      expect(getRemoteAuthFieldType(config)).toBe(REMOTE_MCP_AUTH_TYPES.OAuth2)
    })

    it('returns BearerToken over all other types when bearer_token is present', () => {
      const config = {
        bearer_token: { name: 'token', target: 'TOKEN_SECRET' },
        authorize_url: 'https://auth.example.com/authorize',
        issuer: 'https://auth.example.com/',
        callback_port: 8080,
      }
      expect(getRemoteAuthFieldType(config)).toBe(
        REMOTE_MCP_AUTH_TYPES.BearerToken
      )
    })
  })
})
