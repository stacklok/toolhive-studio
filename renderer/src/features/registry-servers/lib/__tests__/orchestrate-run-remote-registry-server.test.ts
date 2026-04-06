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
})
