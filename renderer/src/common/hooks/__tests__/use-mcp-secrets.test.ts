import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import {
  getMCPSecretFieldValues,
  groupMCPSecretFieldValues,
  saveMCPSecrets,
  useMCPSecrets,
} from '../use-mcp-secrets'
import type { SecretFieldValue, PreparedSecret } from '@/common/types/secrets'
import { recordRequests } from '@/common/mocks/node'
import { mockedGetApiV1BetaSecretsDefaultKeys } from '@/common/mocks/fixtures/secrets_default_keys/get'
import { mockedPostApiV1BetaSecretsDefaultKeys } from '@/common/mocks/fixtures/secrets_default_keys/post'
import type { FormSchemaLocalMcp } from '@/features/mcp-servers/lib/form-schema-local-mcp'

/**
 * Creates reusable mocks for testing the utility functions
 */
function createTestMocks(options?: {
  saveSecretImplementation?: () => Promise<{ key: string }>
}) {
  return {
    mockSaveSecret: vi
      .fn()
      .mockImplementation(
        options?.saveSecretImplementation ||
          (() => Promise.resolve({ key: 'test-key' }))
      ),
    mockOnSecretSuccess: vi.fn(),
    mockOnSecretError: vi.fn(),
  }
}

// Test wrapper component
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

describe('useMCPSecrets', () => {
  const mockOnSecretSuccess = vi.fn()
  const mockOnSecretError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockedGetApiV1BetaSecretsDefaultKeys.override(() => ({
      keys: [{ key: 'SECRET_FROM_STORE' }],
    }))

    mockedPostApiV1BetaSecretsDefaultKeys.override(() => ({
      key: 'SECRET_FROM_STORE',
    }))
  })

  it('returns the expected interface', () => {
    const { result } = renderHook(
      () =>
        useMCPSecrets({
          onSecretSuccess: mockOnSecretSuccess,
          onSecretError: mockOnSecretError,
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current).toHaveProperty('handleSecrets')
    expect(result.current).toHaveProperty('isPendingSecrets')
    expect(result.current).toHaveProperty('isErrorSecrets')
    expect(typeof result.current.handleSecrets).toBe('function')
  })

  it('processes secrets correctly and makes proper API calls', async () => {
    const rec = recordRequests()

    mockedGetApiV1BetaSecretsDefaultKeys.override(() => ({
      keys: [{ key: 'EXISTING_SECRET' }],
    }))

    mockedPostApiV1BetaSecretsDefaultKeys.override(() => ({
      key: 'API_KEY',
    }))

    const mockSecretFieldValues: SecretFieldValue[] = [
      {
        name: 'API_KEY',
        value: { secret: 'secret-value', isFromStore: false },
      },
      {
        name: '',
        value: { secret: 'another-key', isFromStore: true },
      },
      {
        name: 'EXISTING_SECRET',
        value: { secret: 'third-key', isFromStore: true },
      },
    ]

    const { result } = renderHook(
      () =>
        useMCPSecrets({
          onSecretSuccess: mockOnSecretSuccess,
          onSecretError: mockOnSecretError,
        }),
      { wrapper: createWrapper() }
    )

    const handleSecretsResult = await waitFor(async () => {
      return await result.current.handleSecrets(mockSecretFieldValues)
    })

    // Wait for API calls to complete
    await waitFor(() => {
      const apiCalls = rec.recordedRequests.filter((r) =>
        r.pathname.startsWith('/api/v1beta/secrets/default/keys')
      )
      expect(apiCalls.length).toBeGreaterThanOrEqual(1)
    })

    // Verify API calls were made
    const apiCalls = rec.recordedRequests.filter((r) =>
      r.pathname.startsWith('/api/v1beta/secrets')
    )

    // Verify GET call to fetch existing secrets
    const getCalls = apiCalls.filter((r) => r.method === 'GET')
    expect(getCalls).toHaveLength(1)
    expect(getCalls[0]?.pathname).toBe('/api/v1beta/secrets/default/keys')

    // Verify POST call to create new secret
    const postCalls = apiCalls.filter((r) => r.method === 'POST')
    expect(postCalls).toHaveLength(1)
    expect(postCalls[0]?.pathname).toBe('/api/v1beta/secrets/default/keys')
    expect(postCalls[0]?.payload).toEqual({
      key: 'API_KEY',
      value: 'secret-value',
    })

    // Verify result structure
    expect(handleSecretsResult.newlyCreatedSecrets).toEqual([
      {
        name: 'API_KEY',
        target: 'API_KEY',
      },
    ])
    expect(handleSecretsResult.existingSecrets).toEqual([
      {
        name: 'EXISTING_SECRET',
        value: { secret: 'third-key', isFromStore: true },
      },
    ])
  })

  it('handles empty secrets array', async () => {
    const rec = recordRequests()

    mockedGetApiV1BetaSecretsDefaultKeys.override(() => ({
      keys: [],
    }))

    const { result } = renderHook(
      () =>
        useMCPSecrets({
          onSecretSuccess: mockOnSecretSuccess,
          onSecretError: mockOnSecretError,
        }),
      { wrapper: createWrapper() }
    )

    const handleSecretsResult = await waitFor(async () => {
      return await result.current.handleSecrets([])
    })

    // Wait for API calls to complete
    await waitFor(() => {
      const apiCalls = rec.recordedRequests.filter((r) =>
        r.pathname.startsWith('/api/v1beta/secrets')
      )
      expect(apiCalls.length).toBeGreaterThanOrEqual(1)
    })

    // Should only make GET call, no POST calls for empty array
    const apiCalls = rec.recordedRequests.filter((r) =>
      r.pathname.startsWith('/api/v1beta/secrets')
    )

    const getCalls = apiCalls.filter((r) => r.method === 'GET')
    const postCalls = apiCalls.filter((r) => r.method === 'POST')

    expect(getCalls).toHaveLength(1)
    expect(postCalls).toHaveLength(0)

    expect(handleSecretsResult).toEqual({
      newlyCreatedSecrets: [],
      existingSecrets: [],
    })
  })

  it('handles API errors', async () => {
    mockedGetApiV1BetaSecretsDefaultKeys.activateScenario('server-error')

    mockedPostApiV1BetaSecretsDefaultKeys.override(() => ({
      key: 'API_KEY',
    }))

    const { result } = renderHook(
      () =>
        useMCPSecrets({
          onSecretSuccess: mockOnSecretSuccess,
          onSecretError: mockOnSecretError,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(async () => {
      await expect(result.current.handleSecrets([])).rejects.toThrow()
    })
  })

  it('handles secret name collision by creating secret with _2 suffix', async () => {
    const rec = recordRequests()

    mockedGetApiV1BetaSecretsDefaultKeys.override(() => ({
      keys: [{ key: 'API_KEY' }, { key: 'OTHER_SECRET' }],
    }))

    mockedPostApiV1BetaSecretsDefaultKeys.override(() => ({
      key: 'API_KEY_2',
    }))

    const mockSecretFieldValues: SecretFieldValue[] = [
      {
        name: 'API_KEY',
        value: { secret: 'secret-value', isFromStore: false },
      },
    ]

    const { result } = renderHook(
      () =>
        useMCPSecrets({
          onSecretSuccess: mockOnSecretSuccess,
          onSecretError: mockOnSecretError,
        }),
      { wrapper: createWrapper() }
    )

    const handleSecretsResult = await waitFor(async () => {
      return await result.current.handleSecrets(mockSecretFieldValues)
    })

    // Wait for API calls to complete
    await waitFor(() => {
      const apiCalls = rec.recordedRequests.filter((r) =>
        r.pathname.startsWith('/api/v1beta/secrets/default/keys')
      )
      expect(apiCalls.length).toBeGreaterThanOrEqual(1)
    })

    // Verify API calls were made
    const apiCalls = rec.recordedRequests.filter((r) =>
      r.pathname.startsWith('/api/v1beta/secrets/default/keys')
    )

    // Verify GET call to fetch existing secrets
    const getCalls = apiCalls.filter((r) => r.method === 'GET')
    expect(getCalls).toHaveLength(1)
    expect(getCalls[0]?.pathname).toBe('/api/v1beta/secrets/default/keys')

    // Verify POST call to create new secret with _2 suffix
    const postCalls = apiCalls.filter((r) => r.method === 'POST')
    expect(postCalls).toHaveLength(1)
    expect(postCalls[0]?.pathname).toBe('/api/v1beta/secrets/default/keys')
    expect(postCalls[0]?.payload).toEqual({
      key: 'API_KEY_2', // Should have _2 suffix due to collision
      value: 'secret-value',
    })

    // Verify result structure - secret created with collision-resolved name
    expect(handleSecretsResult.newlyCreatedSecrets).toEqual([
      {
        name: 'API_KEY_2',
        target: 'API_KEY',
      },
    ])
    expect(handleSecretsResult.existingSecrets).toEqual([])
  })
})

describe('saveSecrets', () => {
  it('saves secrets serially and calls progress callbacks', async () => {
    const mockSaveSecret = vi.fn(function mockSaveSecret(body, options) {
      // Call the onSuccess callback to simulate successful save
      options.onSuccess?.()
      return Promise.resolve({ key: body.body.key + '_KEY' })
    })

    const onSecretSuccess = vi.fn()
    const onSecretError = vi.fn()

    const secrets: PreparedSecret[] = [
      {
        secretStoreKey: 'SECRET_1',
        target: 'SECRET_1',
        value: 'value-1',
      },
      {
        secretStoreKey: 'SECRET_2',
        target: 'SECRET_2',
        value: 'value-2',
      },
    ]

    const result = await saveMCPSecrets(
      secrets,
      mockSaveSecret,
      onSecretSuccess,
      onSecretError
    )

    expect(mockSaveSecret).toHaveBeenCalledTimes(2)
    expect(mockSaveSecret).toHaveBeenCalledWith(
      { body: { key: 'SECRET_1', value: 'value-1' } },
      expect.any(Object)
    )
    expect(mockSaveSecret).toHaveBeenCalledWith(
      { body: { key: 'SECRET_2', value: 'value-2' } },
      expect.any(Object)
    )

    expect(onSecretSuccess).toHaveBeenCalledTimes(2)
    expect(onSecretSuccess).toHaveBeenCalledWith(1, 2)
    expect(onSecretSuccess).toHaveBeenCalledWith(2, 2)

    expect(onSecretError).not.toHaveBeenCalled()

    expect(result).toEqual([
      {
        name: 'SECRET_1_KEY',
        target: 'SECRET_1',
      },
      {
        name: 'SECRET_2_KEY',
        target: 'SECRET_2',
      },
    ])
  })

  it('saves secrets serially and returns created secrets', async () => {
    const { mockSaveSecret, mockOnSecretSuccess, mockOnSecretError } =
      createTestMocks()

    const secrets: PreparedSecret[] = [
      {
        secretStoreKey: 'SECRET1',
        target: 'TARGET1',
        value: 'value1',
      },
      {
        secretStoreKey: 'SECRET2',
        target: 'TARGET2',
        value: 'value2',
      },
    ]

    // Mock saveSecret to simulate calling the onSuccess callback
    mockSaveSecret.mockImplementation(async (request, options) => {
      const result = { key: request.body.key }
      if (options?.onSuccess) {
        options.onSuccess()
      }
      return result
    })

    const result = await saveMCPSecrets(
      secrets,
      mockSaveSecret,
      mockOnSecretSuccess,
      mockOnSecretError
    )

    expect(mockSaveSecret).toHaveBeenCalledTimes(2)
    expect(mockSaveSecret).toHaveBeenNthCalledWith(
      1,
      { body: { key: 'SECRET1', value: 'value1' } },
      expect.any(Object)
    )
    expect(mockSaveSecret).toHaveBeenNthCalledWith(
      2,
      { body: { key: 'SECRET2', value: 'value2' } },
      expect.any(Object)
    )

    expect(mockOnSecretSuccess).toHaveBeenCalledTimes(2)
    expect(mockOnSecretSuccess).toHaveBeenNthCalledWith(1, 1, 2)
    expect(mockOnSecretSuccess).toHaveBeenNthCalledWith(2, 2, 2)

    expect(result).toEqual([
      { name: 'SECRET1', target: 'TARGET1' },
      { name: 'SECRET2', target: 'TARGET2' },
    ])
  })

  it('handles error when saving a secret fails', async () => {
    const mockError = new Error('Failed to save secret')
    const { mockSaveSecret, mockOnSecretSuccess, mockOnSecretError } =
      createTestMocks()

    const secrets: PreparedSecret[] = [
      {
        secretStoreKey: 'SECRET1',
        target: 'TARGET1',
        value: 'value1',
      },
    ]

    // Mock saveSecret to simulate calling the onError callback
    mockSaveSecret.mockImplementation(async (request, options) => {
      if (options?.onError) {
        options.onError(mockError.message, request)
      }
      throw mockError
    })

    await expect(
      saveMCPSecrets(
        secrets,
        mockSaveSecret,
        mockOnSecretSuccess,
        mockOnSecretError
      )
    ).rejects.toThrow('Failed to save secret')

    expect(mockSaveSecret).toHaveBeenCalledTimes(1)
    expect(mockOnSecretSuccess).not.toHaveBeenCalled()
  })

  it('calls error callback when saveSecret fails', async () => {
    const mockError = new Error('Save failed')
    const mockSaveSecret = vi.fn(function mockSaveSecret(body, options) {
      // Call the onError callback to simulate failed save
      options.onError?.(mockError, body)
      return Promise.reject(mockError)
    })
    const onSecretSuccess = vi.fn()
    const onSecretError = vi.fn()

    const secrets: PreparedSecret[] = [
      {
        secretStoreKey: 'SECRET_1',
        target: 'SECRET_1',
        value: 'value-1',
      },
    ]

    await expect(
      saveMCPSecrets(secrets, mockSaveSecret, onSecretSuccess, onSecretError)
    ).rejects.toThrow('Save failed')

    expect(onSecretError).toHaveBeenCalledWith(mockError, {
      body: { key: 'SECRET_1', value: 'value-1' },
    })
  })

  it('throws error when secret creation returns no key', async () => {
    const { mockSaveSecret, mockOnSecretSuccess, mockOnSecretError } =
      createTestMocks()

    const secrets: PreparedSecret[] = [
      {
        secretStoreKey: 'SECRET1',
        target: 'TARGET1',
        value: 'value1',
      },
    ]

    // Mock saveSecret to return empty key and call onSuccess
    mockSaveSecret.mockImplementation(async (_, options) => {
      const result = { key: '' }
      if (options?.onSuccess) {
        options.onSuccess()
      }
      return result
    })

    await expect(
      saveMCPSecrets(
        secrets,
        mockSaveSecret,
        mockOnSecretSuccess,
        mockOnSecretError
      )
    ).rejects.toThrow('Failed to create secret for key "SECRET1"')
  })

  it('handles empty secrets array', async () => {
    const { mockSaveSecret, mockOnSecretSuccess, mockOnSecretError } =
      createTestMocks()

    const result = await saveMCPSecrets(
      [],
      mockSaveSecret,
      mockOnSecretSuccess,
      mockOnSecretError
    )

    expect(mockSaveSecret).not.toHaveBeenCalled()
    expect(mockOnSecretSuccess).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })

  it('includes delay in non-test environment', async () => {
    // Save original NODE_ENV
    const originalEnv = process.env.NODE_ENV

    try {
      // Set to non-test environment
      process.env.NODE_ENV = 'development'

      const { mockSaveSecret, mockOnSecretSuccess, mockOnSecretError } =
        createTestMocks()

      const secrets: PreparedSecret[] = [
        {
          secretStoreKey: 'SECRET1',
          target: 'TARGET1',
          value: 'value1',
        },
      ]

      // Mock saveSecret to simulate calling the onSuccess callback
      mockSaveSecret.mockImplementation(async (request, options) => {
        const result = { key: request.body.key }
        if (options?.onSuccess) {
          options.onSuccess()
        }
        return result
      })

      const startTime = Date.now()
      await saveMCPSecrets(
        secrets,
        mockSaveSecret,
        mockOnSecretSuccess,
        mockOnSecretError
      )
      const endTime = Date.now()

      // Should have some delay (at least 100ms based on the implementation)
      expect(endTime - startTime).toBeGreaterThanOrEqual(100)
    } finally {
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv
    }
  })
})

describe('groupMCPSecretFieldValues', () => {
  it('separates new and existing secrets correctly', () => {
    const secrets: SecretFieldValue[] = [
      {
        name: 'NEW_SECRET',
        value: { isFromStore: false, secret: 'new-value' },
      },
      {
        name: 'EXISTING_SECRET',
        value: { isFromStore: true, secret: 'existing-key' },
      },
      {
        name: 'ANOTHER_NEW_SECRET',
        value: { isFromStore: false, secret: 'another-new-value' },
      },
    ]

    const result = groupMCPSecretFieldValues(secrets)

    expect(result.newSecrets).toHaveLength(2)
    expect(result.existingSecrets).toHaveLength(1)

    expect(result.newSecrets[0]?.name).toBe('NEW_SECRET')
    expect(result.newSecrets[1]?.name).toBe('ANOTHER_NEW_SECRET')
    expect(result.existingSecrets[0]?.name).toBe('EXISTING_SECRET')
    expect(result.existingSecrets[0]?.value.secret).toBe('existing-key')
    expect(result.existingSecrets[0]?.value.isFromStore).toBe(true)
  })

  it('handles empty secrets array', () => {
    const result = groupMCPSecretFieldValues([])

    expect(result.newSecrets).toHaveLength(0)
    expect(result.existingSecrets).toHaveLength(0)
  })

  it('handles all new secrets', () => {
    const secrets: SecretFieldValue[] = [
      {
        name: 'SECRET1',
        value: { isFromStore: false, secret: 'value1' },
      },
      {
        name: 'SECRET2',
        value: { isFromStore: false, secret: 'value2' },
      },
    ]

    const result = groupMCPSecretFieldValues(secrets)

    expect(result.newSecrets).toHaveLength(2)
    expect(result.existingSecrets).toHaveLength(0)
  })

  it('handles all existing secrets', () => {
    const secrets: SecretFieldValue[] = [
      {
        name: 'SECRET1',
        value: { isFromStore: true, secret: 'key1' },
      },
      {
        name: 'SECRET2',
        value: { isFromStore: true, secret: 'key2' },
      },
    ]

    const result = groupMCPSecretFieldValues(secrets)

    expect(result.newSecrets).toHaveLength(0)
    expect(result.existingSecrets).toHaveLength(2)
    expect(result.existingSecrets[0]?.name).toBe('SECRET1')
    expect(result.existingSecrets[0]?.value.secret).toBe('key1')
    expect(result.existingSecrets[0]?.value.isFromStore).toBe(true)
    expect(result.existingSecrets[1]?.name).toBe('SECRET2')
    expect(result.existingSecrets[1]?.value.secret).toBe('key2')
    expect(result.existingSecrets[1]?.value.isFromStore).toBe(true)
  })
})

describe('getMCPSecretFieldValues', () => {
  it('filters out secrets with empty names', () => {
    const secrets: FormSchemaLocalMcp['secrets'] = [
      {
        name: 'VALID_SECRET',
        value: { secret: 'secret-key', isFromStore: false },
      },
      {
        name: '',
        value: { secret: 'another-key', isFromStore: true },
      },
      {
        name: 'EMPTY_SECRET',
        value: { secret: '', isFromStore: false },
      },
      {
        name: 'ANOTHER_VALID',
        value: { secret: 'third-key', isFromStore: false },
      },
    ]

    const result = getMCPSecretFieldValues(secrets)

    expect(result).toHaveLength(2)
    expect(result[0]?.name).toBe('VALID_SECRET')
    expect(result[1]?.name).toBe('ANOTHER_VALID')
  })

  it('filters out secrets with empty secret values', () => {
    const secrets: FormSchemaLocalMcp['secrets'] = [
      {
        name: 'VALID_SECRET',
        value: { secret: 'secret-key', isFromStore: false },
      },
      {
        name: 'INVALID_SECRET',
        value: { secret: '', isFromStore: false },
      },
    ]

    const result = getMCPSecretFieldValues(secrets)

    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('VALID_SECRET')
  })

  it('preserves isFromStore property', () => {
    const secrets: FormSchemaLocalMcp['secrets'] = [
      {
        name: 'STORE_SECRET',
        value: { secret: 'key1', isFromStore: true },
      },
      {
        name: 'NEW_SECRET',
        value: { secret: 'key2', isFromStore: false },
      },
      {
        name: 'UNDEFINED_STORE',
        value: { secret: 'key3', isFromStore: false },
      },
    ]

    const result = getMCPSecretFieldValues(secrets)

    expect(result).toHaveLength(3)
    expect(result[0]?.value.isFromStore).toBe(true)
    expect(result[1]?.value.isFromStore).toBe(false)
    expect(result[2]?.value.isFromStore).toBe(false) // defaults to false
  })

  it('returns empty array for empty input', () => {
    const result = getMCPSecretFieldValues([])
    expect(result).toEqual([])
  })
})
