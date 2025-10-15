import { it, expect, vi, describe, beforeEach } from 'vitest'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import {
  prepareCreateWorkloadData,
  prepareUpdateRemoteWorkloadData,
  convertCreateRequestToFormData,
} from '../orchestrate-run-remote-server'
import type { V1CreateRequest, V1ListSecretsResponse } from '@api/types.gen'

vi.mock('sonner', async () => {
  const original = await vi.importActual<typeof import('sonner')>('sonner')
  return {
    ...original,
    toast: {
      loading: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      dismiss: vi.fn(),
    },
  }
})

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

    expect(result).toEqual({
      name: 'oauth-server',
      url: 'https://api.example.com',
      transport: 'sse',
      oauth_config: {
        authorize_url: 'https://oauth.example.com/authorize',
        token_url: 'https://oauth.example.com/token',
        client_id: 'my-client-id',
        client_secret: {
          name: 'MY_SECRET_123',
          target: 'MY_SECRET_123',
        },
        scopes: ['read', 'write', 'admin'],
        use_pkce: true,
        skip_browser: false,
        callback_port: 8080,
      },
      group: 'production',
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
        scopes: ['read', 'write'],
        use_pkce: false,
        skip_browser: true,
        callback_port: 9090,
      },
      group: 'staging',
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
        issuer: undefined,
        oauth_params: undefined,
      },
      secrets: [],
      group: 'production',
    })
  })

  it('handles client_secret not in available secrets', () => {
    const createRequest: V1CreateRequest = {
      name: 'NEW_SECRET-server',
      url: 'https://api.example.com',
      transport: 'sse',
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
    }

    const result = convertCreateRequestToFormData(createRequest)

    expect(result.secrets).toEqual([])
    expect(result.auth_type).toBe('none')
  })
})
