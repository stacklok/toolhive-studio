import { describe, expect, it } from 'vitest'
import { hasCredentials } from '../utils'
import { isGatewayProvider, THV_LLM_PROVIDER_ID } from '../gateway-provider'

describe('gateway provider credentials', () => {
  it('treats thv-llm as configured only when Playground has enabled it', () => {
    expect(
      hasCredentials({
        providerId: THV_LLM_PROVIDER_ID,
        endpointURL: '',
        enabledTools: [],
      })
    ).toBe(false)
    expect(
      hasCredentials({
        providerId: THV_LLM_PROVIDER_ID,
        endpointURL: 'enabled',
        enabledTools: [],
      })
    ).toBe(true)
    expect(
      hasCredentials({
        provider: THV_LLM_PROVIDER_ID,
        model: 'gpt-4.1',
        endpointURL: '',
      })
    ).toBe(false)
  })

  it('identifies gateway provider id', () => {
    expect(isGatewayProvider('thv-llm')).toBe(true)
    expect(isGatewayProvider('openai')).toBe(false)
  })
})
