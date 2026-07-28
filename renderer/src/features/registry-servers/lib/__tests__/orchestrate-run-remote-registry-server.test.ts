import { describe, it, expect } from 'vitest'
import type { RegistryRemoteServerMetadata } from '@common/api/registry-types'
import { convertCreateRequestToFormData } from '../orchestrate-run-remote-registry-server'

describe('convertCreateRequestToFormData', () => {
  const baseRequest: RegistryRemoteServerMetadata = {
    name: 'test-server',
    url: 'https://example.com/mcp',
    transport: 'streamable-http',
  }

  it('strips namespace prefix from server name', () => {
    const result = convertCreateRequestToFormData({
      ...baseRequest,
      name: 'io.github.stacklok/fetch',
    })
    expect(result.name).toBe('fetch')
  })

  it('preserves names without a prefix', () => {
    const result = convertCreateRequestToFormData({
      ...baseRequest,
      name: 'my-server',
    })
    expect(result.name).toBe('my-server')
  })

  it('preserves registry OAuth client_secret as a store reference', () => {
    const result = convertCreateRequestToFormData({
      ...baseRequest,
      oauth_config: {
        authorize_url: 'https://auth.example.com/authorize',
        token_url: 'https://auth.example.com/token',
        client_id: 'client-id',
        client_secret: {
          name: 'CLIENT_SECRET',
          target: 'CLIENT_SECRET',
        },
      },
    })

    expect(result.auth_type).toBe('oauth2')
    expect(result.oauth_config.client_secret).toEqual({
      name: 'CLIENT_SECRET',
      value: {
        secret: 'CLIENT_SECRET',
        isFromStore: true,
      },
    })
  })
})
