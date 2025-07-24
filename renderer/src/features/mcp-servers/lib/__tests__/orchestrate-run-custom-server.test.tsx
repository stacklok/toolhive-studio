import { it, expect, vi, describe, beforeEach } from 'vitest'
import type { FormSchemaRunMcpCommand } from '../form-schema-run-mcp-server-with-command'
import {
  saveSecrets,
  prepareCreateWorkloadData,
  groupSecrets,
} from '../orchestrate-run-custom-server'
import type { DefinedSecret, PreparedSecret } from '@/common/types/secrets'
import type { SecretsSecretParameter } from '@/common/api/generated'

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('groupSecrets', () => {
  it('separates new and existing secrets correctly', () => {
    const secrets: DefinedSecret[] = [
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

    const result = groupSecrets(secrets)

    expect(result.newSecrets).toHaveLength(2)
    expect(result.existingSecrets).toHaveLength(1)

    expect(result.newSecrets[0]?.name).toBe('NEW_SECRET')
    expect(result.newSecrets[1]?.name).toBe('ANOTHER_NEW_SECRET')
    expect(result.existingSecrets[0]?.name).toBe('EXISTING_SECRET')
  })

  it('handles empty secrets array', () => {
    const result = groupSecrets([])

    expect(result.newSecrets).toHaveLength(0)
    expect(result.existingSecrets).toHaveLength(0)
  })

  it('handles all new secrets', () => {
    const secrets: DefinedSecret[] = [
      {
        name: 'SECRET1',
        value: { isFromStore: false, secret: 'value1' },
      },
      {
        name: 'SECRET2',
        value: { isFromStore: false, secret: 'value2' },
      },
    ]

    const result = groupSecrets(secrets)

    expect(result.newSecrets).toHaveLength(2)
    expect(result.existingSecrets).toHaveLength(0)
  })

  it('handles all existing secrets', () => {
    const secrets: DefinedSecret[] = [
      {
        name: 'SECRET1',
        value: { isFromStore: true, secret: 'key1' },
      },
      {
        name: 'SECRET2',
        value: { isFromStore: true, secret: 'key2' },
      },
    ]

    const result = groupSecrets(secrets)

    expect(result.newSecrets).toHaveLength(0)
    expect(result.existingSecrets).toHaveLength(2)
  })
})

describe('prepareCreateWorkloadData', () => {
  it('prepares data for docker image type', () => {
    const data: FormSchemaRunMcpCommand = {
      image: 'ghcr.io/github/github-mcp-server',
      name: 'foo-bar',
      transport: 'stdio',
      type: 'docker_image',
      envVars: [
        { name: 'DEBUG', value: 'true' },
        { name: 'PORT', value: '8080' },
      ],
      secrets: [],
      cmd_arguments: ['--debug', '--port', '8080'],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
    }

    const secrets: SecretsSecretParameter[] = [
      { name: 'secret-key', target: 'API_TOKEN' },
    ]

    const result = prepareCreateWorkloadData(data, secrets)

    expect(result).toEqual({
      name: 'foo-bar',
      image: 'ghcr.io/github/github-mcp-server',
      transport: 'stdio',
      cmd_arguments: ['--debug', '--port', '8080'],
      env_vars: ['DEBUG=true', 'PORT=8080'],
      secrets: [{ name: 'secret-key', target: 'API_TOKEN' }],
      network_isolation: false,
      permission_profile: undefined,
    })
  })

  it('prepares data for package manager type', () => {
    const data: FormSchemaRunMcpCommand = {
      package_name: 'my-package',
      protocol: 'npx',
      name: 'npm-server',
      transport: 'stdio',
      type: 'package_manager',
      envVars: [],
      secrets: [],
      cmd_arguments: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result).toEqual({
      name: 'npm-server',
      image: 'npx://my-package',
      transport: 'stdio',
      cmd_arguments: [],
      env_vars: [],
      secrets: [],
      network_isolation: false,
      permission_profile: undefined,
    })
  })

  it('filters out environment variables with empty values', () => {
    const data: FormSchemaRunMcpCommand = {
      image: 'test-image',
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      envVars: [
        { name: 'DEBUG', value: 'true' },
        { name: 'EMPTY_VAR', value: '' },
        { name: 'WHITESPACE_VAR', value: '   ' },
        { name: 'VALID_VAR', value: 'value' },
      ],
      secrets: [],
      cmd_arguments: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.env_vars).toEqual(['DEBUG=true', 'VALID_VAR=value'])
  })

  it('handles empty command arguments', () => {
    const data: FormSchemaRunMcpCommand = {
      image: 'test-image',
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      envVars: [],
      secrets: [],
      cmd_arguments: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.cmd_arguments).toEqual([])
  })

  it('handles command arguments with multiple spaces', () => {
    const data: FormSchemaRunMcpCommand = {
      image: 'test-image',
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      envVars: [],
      secrets: [],
      cmd_arguments: ['--flag1', '--flag2=value', '--flag3'],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.cmd_arguments).toEqual([
      '--flag1',
      '--flag2=value',
      '--flag3',
    ])
  })

  it('works without secrets parameter', () => {
    const data: FormSchemaRunMcpCommand = {
      image: 'test-image',
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      envVars: [],
      secrets: [],
      cmd_arguments: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.secrets).toEqual([])
  })

  it('includes network isolation data when enabled', () => {
    const data: FormSchemaRunMcpCommand = {
      image: 'test-image',
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      envVars: [],
      secrets: [],
      cmd_arguments: [],
      networkIsolation: true,
      allowedHosts: ['example.com', '.subdomain.com'],
      allowedPorts: ['8080', '443'],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.network_isolation).toBe(true)
    expect(result.permission_profile).toEqual({
      network: {
        outbound: {
          allow_host: ['example.com', '.subdomain.com'],
          allow_port: [8080, 443],
          insecure_allow_all: false,
        },
      },
    })
  })

  it('excludes network isolation data when disabled', () => {
    const data: FormSchemaRunMcpCommand = {
      image: 'test-image',
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      envVars: [],
      secrets: [],
      cmd_arguments: [],
      networkIsolation: false,
      allowedHosts: ['example.com'],
      allowedPorts: ['8080'],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.network_isolation).toBe(false)
    expect(result.permission_profile).toBeUndefined()
  })
})

describe('saveSecrets', () => {
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

    const result = await saveSecrets(
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
      saveSecrets(
        secrets,
        mockSaveSecret,
        mockOnSecretSuccess,
        mockOnSecretError
      )
    ).rejects.toThrow('Failed to save secret')

    expect(mockSaveSecret).toHaveBeenCalledTimes(1)
    expect(mockOnSecretSuccess).not.toHaveBeenCalled()
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
      saveSecrets(
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

    const result = await saveSecrets(
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
      await saveSecrets(
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
