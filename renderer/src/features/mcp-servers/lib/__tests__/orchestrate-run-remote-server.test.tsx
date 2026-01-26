import { it, expect, vi, describe, beforeEach } from 'vitest'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import {
  prepareCreateWorkloadData,
  prepareUpdateRemoteWorkloadData,
  convertCreateRequestToFormData,
} from '../orchestrate-run-remote-server'
import type { V1CreateRequest, V1ListSecretsResponse } from '@api/types.gen'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('prepareCreateWorkloadData', () => {
  it('transforms OAuth2 config with client_secret and omits auth_type/secrets', () => {
    const data: FormSchemaRemoteMcp = {
      name: 'oauth-server',
      url: 'https://api.example.com',
      transport: 'sse',
      auth_type: 'oauth2',
      oauth_config: {
        authorize_url: 'https://oauth.example.com/authorize',
        token_url: 'https://oauth.example.com/token',
        client_id: 'my-client-id',
        client_secret: {
          name: 'oauth-secret',
          value: {
            secret: 'MY_SECRET_123',
            isFromStore: true,
          },
        },
        scopes: 'read,write,admin',
        use_pkce: true,
        skip_browser: false,
        callback_port: 8080,
      },
      secrets: [
        {
          name: 'API_KEY',
          value: {
            secret: 'MY_SECRET',
            isFromStore: true,
          },
        },
      ],
      group: 'production',
    }

    const result = prepareCreateWorkloadData(data)

    // Uses client_secret.name (the prefilled key name), not value.secret
    expect(result).toEqual({
      name: 'oauth-server',
      url: 'https://api.example.com',
      transport: 'sse',
      oauth_config: {
        authorize_url: 'https://oauth.example.com/authorize',
        token_url: 'https://oauth.example.com/token',
        client_id: 'my-client-id',
        client_secret: {
          name: 'oauth-secret',
          target: 'oauth-secret',
        },
        bearer_token: undefined,
        scopes: ['read', 'write', 'admin'],
        use_pkce: true,
        skip_browser: false,
        callback_port: 8080,
      },
      group: 'production',
      tools: undefined,
      tools_override: undefined,
    })

    expect(result).not.toHaveProperty('auth_type')
    expect(result).not.toHaveProperty('secrets')
  })

  it('handles empty and undefined scopes correctly', () => {
    const data: FormSchemaRemoteMcp = {
      name: 'no-scopes-server',
      url: 'https://api.example.com',
      transport: 'sse',
      auth_type: 'oauth2',
      oauth_config: {
        authorize_url: 'https://oauth.example.com/authorize',
        token_url: 'https://oauth.example.com/token',
        client_id: 'client-id',
        use_pkce: true,
        skip_browser: false,
      },
      secrets: [],
      group: 'default',
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.oauth_config).toBeDefined()
    expect(result.oauth_config?.scopes).toEqual([])
    expect(result.oauth_config?.client_secret).toBeUndefined()
  })

  it('transforms bearer_token auth and sets client_secret to undefined', () => {
    const data: FormSchemaRemoteMcp = {
      name: 'bearer-server',
      url: 'https://api.example.com',
      transport: 'sse',
      auth_type: 'bearer_token',
      oauth_config: {
        bearer_token: {
          name: 'BEARER_TOKEN_BEARER_SERVER',
          value: {
            secret: 'my-bearer-token-value',
            isFromStore: true,
          },
        },
        use_pkce: false,
        skip_browser: false,
      },
      secrets: [],
      group: 'default',
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.oauth_config?.bearer_token).toEqual({
      name: 'BEARER_TOKEN_BEARER_SERVER',
      target: 'BEARER_TOKEN_BEARER_SERVER',
    })
    expect(result.oauth_config?.client_secret).toBeUndefined()
    expect(result).not.toHaveProperty('auth_type')
  })
})

describe('prepareUpdateRemoteWorkloadData', () => {
  it('transforms OAuth2 config with client_secret and omits auth_type/secrets', () => {
    const data: FormSchemaRemoteMcp = {
      name: 'updated-oauth-server',
      url: 'https://api.updated.com',
      transport: 'streamable-http',
      auth_type: 'oauth2',
      oauth_config: {
        authorize_url: 'https://oauth.updated.com/authorize',
        token_url: 'https://oauth.updated.com/token',
        client_id: 'UPDATED_client-id',
        client_secret: {
          name: 'UPDATED_SECRET',
          value: {
            secret: 'UPDATED_SECRET_KEY',
            isFromStore: false,
          },
        },
        scopes: 'read,write',
        use_pkce: false,
        skip_browser: true,
        callback_port: 9090,
      },
      secrets: [
        {
          name: 'API_KEY',
          value: {
            secret: 'MY_SECRET',
            isFromStore: true,
          },
        },
      ],
      group: 'staging',
    }

    const result = prepareUpdateRemoteWorkloadData(data)

    expect(result).toEqual({
      name: 'updated-oauth-server',
      url: 'https://api.updated.com',
      transport: 'streamable-http',
      oauth_config: {
        authorize_url: 'https://oauth.updated.com/authorize',
        token_url: 'https://oauth.updated.com/token',
        client_id: 'UPDATED_client-id',
        client_secret: {
          name: 'UPDATED_SECRET_KEY',
          target: 'UPDATED_SECRET_KEY',
        },
        bearer_token: undefined,
        scopes: ['read', 'write'],
        use_pkce: false,
        skip_browser: true,
        callback_port: 9090,
      },
      group: 'staging',
      tools: undefined,
      tools_override: undefined,
    })

    expect(result).not.toHaveProperty('auth_type')
    expect(result).not.toHaveProperty('secrets')
  })
})

describe('convertCreateRequestToFormData', () => {
  it('converts OAuth2 request with client_secret correctly', () => {
    const createRequest: V1CreateRequest = {
      name: 'oauth-server',
      url: 'https://api.example.com',
      transport: 'sse',
      proxy_mode: 'streamable-http',
      oauth_config: {
        authorize_url: 'https://oauth.example.com/authorize',
        token_url: 'https://oauth.example.com/token',
        client_id: 'my-client-id',
        client_secret: {
          name: 'oauth-secret',
          target: 'MY_SECRET_123',
        },
        scopes: ['read', 'write', 'admin'],
        use_pkce: true,
        skip_browser: false,
        callback_port: 8080,
      },
      secrets: [],
      group: 'production',
    }

    const availableSecrets: V1ListSecretsResponse = {
      keys: [{ key: 'MY_SECRET_123' }, { key: 'STORED_SECRET' }],
    }

    const result = convertCreateRequestToFormData(
      createRequest,
      availableSecrets
    )

    expect(result).toEqual({
      name: 'oauth-server',
      url: 'https://api.example.com',
      transport: 'sse',
      proxy_port: undefined,
      auth_type: 'oauth2',
      oauth_config: {
        authorize_url: 'https://oauth.example.com/authorize',
        token_url: 'https://oauth.example.com/token',
        client_id: 'my-client-id',
        client_secret: {
          name: 'oauth-secret',
          value: {
            secret: 'MY_SECRET_123',
            isFromStore: true,
          },
        },
        bearer_token: undefined,
        scopes: 'read,write,admin',
        use_pkce: true,
        skip_browser: false,
        callback_port: 8080,
        issuer: undefined,
        oauth_params: undefined,
      },
      secrets: [],
      group: 'production',
      tools: undefined,
      tools_override: undefined,
    })
  })

  it('handles client_secret not in available secrets', () => {
    const createRequest: V1CreateRequest = {
      name: 'NEW_SECRET-server',
      url: 'https://api.example.com',
      transport: 'sse',
      proxy_mode: 'streamable-http',
      oauth_config: {
        authorize_url: 'https://oauth.example.com/authorize',
        token_url: 'https://oauth.example.com/token',
        client_id: 'client-id',
        client_secret: {
          name: 'NEW_SECRET-name',
          target: 'NEW_SECRET-key',
        },
        use_pkce: true,
        skip_browser: false,
      },
    }

    const availableSecrets: V1ListSecretsResponse = {
      keys: [{ key: 'DIFFERENT_SECRET' }],
    }

    const result = convertCreateRequestToFormData(
      createRequest,
      availableSecrets
    )

    expect(result.oauth_config).toBeDefined()
    expect(result.oauth_config.client_secret).toEqual({
      name: 'NEW_SECRET-name',
      value: {
        secret: 'NEW_SECRET-key',
        isFromStore: false,
      },
    })
  })

  it('handles empty secrets list', () => {
    const createRequest: V1CreateRequest = {
      name: 'no-secrets-server',
      url: 'https://api.example.com',
      transport: 'sse',
      proxy_mode: 'streamable-http',
    }

    const result = convertCreateRequestToFormData(createRequest)

    expect(result.secrets).toEqual([])
    expect(result.auth_type).toBe('none')
  })
})
