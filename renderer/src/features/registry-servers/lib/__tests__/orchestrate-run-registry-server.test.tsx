import { it, expect, vi, describe } from 'vitest'
import type { FormSchemaRunFromRegistry } from '../get-form-schema-run-from-registry'
import type { RegistryImageMetadata } from '@/common/api/generated'
import {
  getDefinedSecrets,
  saveSecrets,
  prepareCreateWorkloadData,
  groupSecrets,
} from '../orchestrate-run-registry-server'
import type { DefinedSecret, PreparedSecret } from '@/common/types/secrets'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getDefinedSecrets', () => {
  it('filters out secrets with empty name or secret value', () => {
    const secrets: FormSchemaRunFromRegistry['secrets'] = [
      {
        name: 'GITHUB_API_TOKEN',
        value: { secret: 'foo-bar', isFromStore: false },
      },
      {
        name: '',
        value: { secret: 'some-value', isFromStore: false },
      },
      {
        name: 'EMPTY_SECRET',
        value: { secret: '', isFromStore: false },
      },
      {
        name: 'VALID_SECRET',
        value: { secret: 'valid-value', isFromStore: true },
      },
    ]

    const result = getDefinedSecrets(secrets)

    expect(result).toEqual([
      {
        name: 'GITHUB_API_TOKEN',
        value: { secret: 'foo-bar', isFromStore: false },
      },
      {
        name: 'VALID_SECRET',
        value: { secret: 'valid-value', isFromStore: true },
      },
    ])
  })

  it('returns empty array when no valid secrets', () => {
    const secrets: FormSchemaRunFromRegistry['secrets'] = [
      {
        name: '',
        value: { secret: 'some-value', isFromStore: false },
      },
      {
        name: 'EMPTY_SECRET',
        value: { secret: '', isFromStore: false },
      },
    ]

    const result = getDefinedSecrets(secrets)

    expect(result).toEqual([])
  })

  it('handles empty secrets array', () => {
    const result = getDefinedSecrets([])
    expect(result).toEqual([])
  })
})

describe('groupSecrets', () => {
  it('groups secrets into new and existing categories', () => {
    const secrets: DefinedSecret[] = [
      {
        name: 'NEW_SECRET',
        value: { secret: 'new-value', isFromStore: false },
      },
      {
        name: 'EXISTING_SECRET',
        value: { secret: 'existing-key', isFromStore: true },
      },
      {
        name: 'ANOTHER_NEW_SECRET',
        value: { secret: 'another-new-value', isFromStore: false },
      },
    ]

    const result = groupSecrets(secrets)

    expect(result.newSecrets).toEqual([
      {
        name: 'NEW_SECRET',
        value: { secret: 'new-value', isFromStore: false },
      },
      {
        name: 'ANOTHER_NEW_SECRET',
        value: { secret: 'another-new-value', isFromStore: false },
      },
    ])

    expect(result.existingSecrets).toEqual([
      {
        name: 'EXISTING_SECRET',
        value: { secret: 'existing-key', isFromStore: true },
      },
    ])
  })

  it('handles empty secrets array', () => {
    const result = groupSecrets([])
    expect(result).toEqual({
      newSecrets: [],
      existingSecrets: [],
    })
  })

  it('handles all new secrets', () => {
    const secrets: DefinedSecret[] = [
      {
        name: 'NEW_SECRET_1',
        value: { secret: 'value-1', isFromStore: false },
      },
      {
        name: 'NEW_SECRET_2',
        value: { secret: 'value-2', isFromStore: false },
      },
    ]

    const result = groupSecrets(secrets)

    expect(result.newSecrets).toEqual(secrets)
    expect(result.existingSecrets).toEqual([])
  })

  it('handles all existing secrets', () => {
    const secrets: DefinedSecret[] = [
      {
        name: 'EXISTING_SECRET_1',
        value: { secret: 'key-1', isFromStore: true },
      },
      {
        name: 'EXISTING_SECRET_2',
        value: { secret: 'key-2', isFromStore: true },
      },
    ]

    const result = groupSecrets(secrets)

    expect(result.newSecrets).toEqual([])
    expect(result.existingSecrets).toEqual(secrets)
  })
})

describe('prepareCreateWorkloadData', () => {
  const SERVER: RegistryImageMetadata = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
    target_port: 8080,
  }

  it('prepares workload data with all fields', () => {
    const data: FormSchemaRunFromRegistry = {
      serverName: 'Test Server',
      envVars: [
        { name: 'DEBUG', value: 'true' },
        { name: 'PORT', value: '8080' },
      ],
      secrets: [],
      cmd_arguments: '--debug --port 8080',
    }

    const secrets = [
      {
        name: 'GITHUB_API_TOKEN',
        target: 'GITHUB_API_TOKEN',
      },
    ]

    const result = prepareCreateWorkloadData(SERVER, data, secrets)

    expect(result).toEqual({
      name: 'Test Server',
      image: 'test-image',
      transport: 'stdio',
      env_vars: ['DEBUG=true', 'PORT=8080'],
      secrets,
      cmd_arguments: ['--debug', '--port', '8080'],
      target_port: 8080,
    })
  })

  it('handles empty env vars and secrets', () => {
    const data: FormSchemaRunFromRegistry = {
      serverName: 'Test Server',
      envVars: [],
      secrets: [],
    }

    const result = prepareCreateWorkloadData(SERVER, data)

    expect(result).toEqual({
      name: 'Test Server',
      image: 'test-image',
      transport: 'stdio',
      env_vars: [],
      secrets: [],
      cmd_arguments: [],
      target_port: 8080,
    })
  })

  it('handles empty cmd_arguments', () => {
    const data: FormSchemaRunFromRegistry = {
      serverName: 'Test Server',
      envVars: [],
      secrets: [],
      cmd_arguments: '',
    }

    const result = prepareCreateWorkloadData(SERVER, data)

    expect(result.cmd_arguments).toEqual([])
  })

  it('handles undefined cmd_arguments', () => {
    const data: FormSchemaRunFromRegistry = {
      serverName: 'Test Server',
      envVars: [],
      secrets: [],
      cmd_arguments: undefined,
    }

    const result = prepareCreateWorkloadData(SERVER, data)

    expect(result.cmd_arguments).toEqual([])
  })

  it('handles server without target_port', () => {
    const serverWithoutPort: RegistryImageMetadata = {
      name: 'test-server',
      image: 'test-image',
      transport: 'stdio',
    }

    const data: FormSchemaRunFromRegistry = {
      serverName: 'Test Server',
      envVars: [],
      secrets: [],
    }

    const result = prepareCreateWorkloadData(serverWithoutPort, data)

    expect(result.target_port).toBeUndefined()
  })
})

describe('saveSecrets', () => {
  it('saves secrets serially and calls progress callbacks', async () => {
    const mockSaveSecret = vi.fn().mockImplementation((body, options) => {
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

    const result = await saveSecrets(
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

  it('handles empty secrets array', async () => {
    const mockSaveSecret = vi.fn()
    const onSecretSuccess = vi.fn()
    const onSecretError = vi.fn()

    const result = await saveSecrets(
      [],
      mockSaveSecret,
      onSecretSuccess,
      onSecretError
    )

    expect(mockSaveSecret).not.toHaveBeenCalled()
    expect(onSecretSuccess).not.toHaveBeenCalled()
    expect(onSecretError).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })

  it('throws error when saveSecret returns no key', async () => {
    const mockSaveSecret = vi.fn().mockImplementation((body, options) => {
      // Call the onSuccess callback to simulate successful save
      options.onSuccess?.()
      return Promise.resolve({ key: null })
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
      saveSecrets(secrets, mockSaveSecret, onSecretSuccess, onSecretError)
    ).rejects.toThrow('Failed to create secret for key "SECRET_1"')
  })

  it('calls error callback when saveSecret fails', async () => {
    const mockError = new Error('Save failed')
    const mockSaveSecret = vi.fn().mockImplementation((body, options) => {
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
      saveSecrets(secrets, mockSaveSecret, onSecretSuccess, onSecretError)
    ).rejects.toThrow('Save failed')

    expect(onSecretError).toHaveBeenCalledWith(mockError, {
      body: { key: 'SECRET_1', value: 'value-1' },
    })
  })
})
