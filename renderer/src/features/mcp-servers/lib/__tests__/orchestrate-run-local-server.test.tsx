import { it, expect, vi, describe, beforeEach } from 'vitest'
import type { FormSchemaLocalMcp } from '../form-schema-local-mcp'
import {
  prepareCreateWorkloadData,
  convertWorkloadToFormData,
  convertCreateRequestToFormData,
  prepareUpdateWorkloadData,
} from '../orchestrate-run-local-server'
import type {
  SecretsSecretParameter,
  CoreWorkload,
  V1CreateRequest,
  V1ListSecretsResponse,
} from '@api/types.gen'

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
  it('prepares data for docker image type', () => {
    const data: FormSchemaLocalMcp = {
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
      volumes: [],
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
      env_vars: { DEBUG: 'true', PORT: '8080' },
      secrets: [{ name: 'secret-key', target: 'API_TOKEN' }],
      network_isolation: false,
      permission_profile: undefined,
      volumes: [],
    })
  })

  it('prepares data for package manager type', () => {
    const data: FormSchemaLocalMcp = {
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
      volumes: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result).toEqual({
      name: 'npm-server',
      image: 'npx://my-package',
      transport: 'stdio',
      cmd_arguments: [],
      env_vars: {},
      secrets: [],
      network_isolation: false,
      permission_profile: undefined,
      volumes: [],
    })
  })

  it('filters out environment variables with empty values', () => {
    const data: FormSchemaLocalMcp = {
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
      volumes: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.env_vars).toEqual({ DEBUG: 'true', VALID_VAR: 'value' })
  })

  it('configure volumes', () => {
    const data: FormSchemaLocalMcp = {
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
      volumes: [
        {
          host: '/path/to/host',
          container: '/path/to/container',
        },
        {
          host: '/path/to/host',
          container: '/path/to/container',
          accessMode: 'ro',
        },
      ],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.volumes).toEqual([
      '/path/to/host:/path/to/container',
      '/path/to/host:/path/to/container:ro',
    ])
  })

  it('handles empty command arguments', () => {
    const data: FormSchemaLocalMcp = {
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
      volumes: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.cmd_arguments).toEqual([])
  })

  it('handles command arguments with multiple spaces', () => {
    const data: FormSchemaLocalMcp = {
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
      volumes: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.cmd_arguments).toEqual([
      '--flag1',
      '--flag2=value',
      '--flag3',
    ])
  })

  it('works without secrets parameter', () => {
    const data: FormSchemaLocalMcp = {
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
      volumes: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.secrets).toEqual([])
  })

  it('includes network isolation data when enabled', () => {
    const data: FormSchemaLocalMcp = {
      image: 'test-image',
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      envVars: [],
      secrets: [],
      cmd_arguments: [],
      networkIsolation: true,
      allowedHosts: [{ value: 'example.com' }, { value: '.subdomain.com' }],
      allowedPorts: [{ value: '8080' }, { value: '443' }],
      volumes: [],
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
    const data: FormSchemaLocalMcp = {
      image: 'test-image',
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      envVars: [],
      secrets: [],
      cmd_arguments: [],
      networkIsolation: false,
      allowedHosts: [{ value: 'example.com' }],
      allowedPorts: [{ value: '8080' }],
      volumes: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.network_isolation).toBe(false)
    expect(result.permission_profile).toBeUndefined()
  })

  it('ignores invalid allowedHosts and allowedPorts when network isolation is disabled', () => {
    const data: FormSchemaLocalMcp = {
      image: 'test-image',
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      envVars: [],
      secrets: [],
      cmd_arguments: [],
      networkIsolation: false,
      allowedHosts: [{ value: 'invalid-host.com' }],
      allowedPorts: [{ value: '999999' }],
      volumes: [],
    }

    const result = prepareCreateWorkloadData(data)

    expect(result.network_isolation).toBe(false)
    expect(result.permission_profile).toBeUndefined()

    expect(() => prepareCreateWorkloadData(data)).not.toThrow()
  })
})

describe('convertWorkloadToFormData', () => {
  it('converts docker workload to form data', () => {
    const workload: CoreWorkload = {
      name: 'docker-server',
      package: 'ghcr.io/test/server',
      transport_type: 'stdio',
    }

    const result = convertWorkloadToFormData(workload)

    expect(result).toEqual({
      name: 'docker-server',
      transport: 'stdio',
      target_port: undefined,
      cmd_arguments: [],
      envVars: [],
      secrets: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
      type: 'docker_image',
      image: 'ghcr.io/test/server',
    })
  })

  it('converts package manager workload to form data', () => {
    const workload: CoreWorkload = {
      name: 'npm-server',
      package: 'npx://my-package',
      transport_type: 'sse',
      port: 8080,
    }

    const result = convertWorkloadToFormData(workload)

    expect(result).toEqual({
      name: 'npm-server',
      transport: 'sse',
      target_port: 8080,
      cmd_arguments: [],
      envVars: [],
      secrets: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
      type: 'package_manager',
      protocol: 'npx',
      package_name: 'my-package',
    })
  })

  it('handles uvx protocol', () => {
    const workload: CoreWorkload = {
      name: 'python-server',
      package: 'uvx://python-package',
      transport_type: 'stdio',
    }

    const result = convertWorkloadToFormData(workload)

    expect(result.type).toBe('package_manager')
    if (result.type === 'package_manager') {
      expect(result.protocol).toBe('uvx')
      expect(result.package_name).toBe('python-package')
    }
  })

  it('handles go protocol', () => {
    const workload: CoreWorkload = {
      name: 'go-server',
      package: 'go://go-package',
      transport_type: 'stdio',
    }

    const result = convertWorkloadToFormData(workload)

    expect(result.type).toBe('package_manager')
    if (result.type === 'package_manager') {
      expect(result.protocol).toBe('go')
      expect(result.package_name).toBe('go-package')
    }
  })

  it('handles workload with empty package', () => {
    const workload: CoreWorkload = {
      name: 'empty-server',
      package: '',
      transport_type: 'stdio',
    }

    const result = convertWorkloadToFormData(workload)

    expect(result.type).toBe('docker_image')
    if (result.type === 'docker_image') {
      expect(result.image).toBe('')
    }
  })

  it('defaults to stdio transport when not provided', () => {
    const workload: CoreWorkload = {
      name: 'default-server',
      package: 'test-image',
    }

    const result = convertWorkloadToFormData(workload)

    expect(result.transport).toBe('stdio')
  })
})

describe('convertCreateRequestToFormData', () => {
  it('converts docker create request to form data', () => {
    const createRequest: V1CreateRequest = {
      name: 'docker-server',
      image: 'ghcr.io/test/server',
      transport: 'stdio',
      cmd_arguments: ['--debug'],
      env_vars: { DEBUG: 'true', PORT: '8080' },
      secrets: [{ name: 'secret-key', target: 'API_TOKEN' }],
    }

    const availableSecrets: V1ListSecretsResponse = {
      keys: [{ key: 'secret-key' }],
    }

    const result = convertCreateRequestToFormData(
      createRequest,
      availableSecrets
    )

    expect(result).toEqual({
      name: 'docker-server',
      transport: 'stdio',
      target_port: 0,
      cmd_arguments: ['--debug'],
      envVars: [
        { name: 'DEBUG', value: 'true' },
        { name: 'PORT', value: '8080' },
      ],
      secrets: [
        {
          name: 'API_TOKEN',
          value: { secret: 'secret-key', isFromStore: true },
        },
      ],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
      type: 'docker_image',
      image: 'ghcr.io/test/server',
    })
  })

  it('converts package manager create request to form data', () => {
    const createRequest: V1CreateRequest = {
      name: 'npm-server',
      image: 'npx://my-package',
      transport: 'sse',
      target_port: 3000,
    }

    const result = convertCreateRequestToFormData(createRequest)

    expect(result).toEqual({
      name: 'npm-server',
      transport: 'sse',
      target_port: 3000,
      cmd_arguments: [],
      envVars: [],
      secrets: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
      type: 'package_manager',
      protocol: 'npx',
      package_name: 'my-package',
    })
  })

  it('handles invalid transport gracefully', () => {
    const createRequest: V1CreateRequest = {
      name: 'test-server',
      image: 'test-image',
      transport: 'invalid-transport' as 'stdio',
    }

    const result = convertCreateRequestToFormData(createRequest)

    expect(result.transport).toBe('stdio') // defaults to stdio
  })

  it('marks secrets as not from store when not available', () => {
    const createRequest: V1CreateRequest = {
      name: 'test-server',
      image: 'test-image',
      secrets: [{ name: 'unknown-key', target: 'SECRET' }],
    }

    const availableSecrets: V1ListSecretsResponse = {
      keys: [{ key: 'different-key' }],
    }

    const result = convertCreateRequestToFormData(
      createRequest,
      availableSecrets
    )

    expect(result.secrets[0]?.value.isFromStore).toBe(false)
  })

  it('converts network isolation settings', () => {
    const createRequest: V1CreateRequest = {
      name: 'test-server',
      image: 'test-image',
      network_isolation: true,
      permission_profile: {
        network: {
          outbound: {
            allow_host: ['example.com', 'api.test.com'],
            allow_port: [80, 443],
            insecure_allow_all: false,
          },
        },
      },
    }

    const result = convertCreateRequestToFormData(createRequest)

    expect(result.networkIsolation).toBe(true)
    expect(result.allowedHosts).toEqual([
      { value: 'example.com' },
      { value: 'api.test.com' },
    ])
    expect(result.allowedPorts).toEqual([{ value: '80' }, { value: '443' }])
  })

  it('converts volumes correctly', () => {
    const createRequest: V1CreateRequest = {
      name: 'test-server',
      image: 'test-image',
      volumes: [
        '/host/path:/container/path',
        '/host2:/container2:ro',
        '/host3:/container3:rw',
      ],
    }

    const result = convertCreateRequestToFormData(createRequest)

    expect(result.volumes).toEqual([
      { host: '/host/path', container: '/container/path', accessMode: 'rw' },
      { host: '/host2', container: '/container2', accessMode: 'ro' },
      { host: '/host3', container: '/container3', accessMode: 'rw' },
    ])
  })

  it('handles empty or undefined values gracefully', () => {
    const createRequest: V1CreateRequest = {
      name: '',
      image: '',
    }

    const result = convertCreateRequestToFormData(createRequest)

    expect(result.name).toBe('')
    expect(result.transport).toBe('stdio')
    if (result.type === 'docker_image') {
      expect(result.image).toBe('')
    }
    expect(result.cmd_arguments).toEqual([])
    expect(result.envVars).toEqual([])
    expect(result.secrets).toEqual([])
  })
})

describe('prepareUpdateWorkloadData', () => {
  it('prepares update data for docker image type', () => {
    const data: FormSchemaLocalMcp = {
      name: 'updated-server',
      transport: 'sse',
      target_port: 3000,
      type: 'docker_image',
      image: 'ghcr.io/test/updated-server',
      cmd_arguments: ['--verbose'],
      envVars: [
        { name: 'DEBUG', value: 'true' },
        { name: 'LOG_LEVEL', value: 'info' },
      ],
      secrets: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
    }

    const secrets: SecretsSecretParameter[] = [
      { name: 'api-key', target: 'API_KEY' },
    ]

    const result = prepareUpdateWorkloadData(data, secrets)

    expect(result).toEqual({
      image: 'ghcr.io/test/updated-server',
      transport: 'sse',
      target_port: 3000,
      cmd_arguments: ['--verbose'],
      env_vars: { DEBUG: 'true', LOG_LEVEL: 'info' },
      secrets: [{ name: 'api-key', target: 'API_KEY' }],
      network_isolation: false,
      permission_profile: undefined,
      volumes: [],
    })
  })

  it('prepares update data for package manager type', () => {
    const data: FormSchemaLocalMcp = {
      name: 'npm-updated',
      transport: 'stdio',
      type: 'package_manager',
      protocol: 'uvx',
      package_name: 'updated-package',
      cmd_arguments: [],
      envVars: [],
      secrets: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
    }

    const result = prepareUpdateWorkloadData(data)

    expect(result.image).toBe('uvx://updated-package')
    expect(result.transport).toBe('stdio')
  })

  it('includes network isolation settings when enabled', () => {
    const data: FormSchemaLocalMcp = {
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      image: 'test-image',
      cmd_arguments: [],
      envVars: [],
      secrets: [],
      networkIsolation: true,
      allowedHosts: [{ value: 'api.example.com' }],
      allowedPorts: [{ value: '443' }, { value: '80' }],
      volumes: [],
    }

    const result = prepareUpdateWorkloadData(data)

    expect(result.network_isolation).toBe(true)
    expect(result.permission_profile).toEqual({
      network: {
        outbound: {
          allow_host: ['api.example.com'],
          allow_port: [443, 80],
          insecure_allow_all: false,
        },
      },
    })
  })

  it('filters out empty environment variables', () => {
    const data: FormSchemaLocalMcp = {
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      image: 'test-image',
      cmd_arguments: [],
      envVars: [
        { name: 'VALID_VAR', value: 'valid-value' },
        { name: 'EMPTY_VAR', value: '' },
        { name: 'WHITESPACE_VAR', value: '   ' },
      ],
      secrets: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
    }

    const result = prepareUpdateWorkloadData(data)

    expect(result.env_vars).toEqual({ VALID_VAR: 'valid-value' })
  })

  it('handles volumes correctly', () => {
    const data: FormSchemaLocalMcp = {
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      image: 'test-image',
      cmd_arguments: [],
      envVars: [],
      secrets: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
      volumes: [
        { host: '/host1', container: '/container1' },
        { host: '/host2', container: '/container2', accessMode: 'ro' },
      ],
    }

    const result = prepareUpdateWorkloadData(data)

    expect(result.volumes).toEqual([
      '/host1:/container1',
      '/host2:/container2:ro',
    ])
  })

  it('works without secrets parameter', () => {
    const data: FormSchemaLocalMcp = {
      name: 'test-server',
      transport: 'stdio',
      type: 'docker_image',
      image: 'test-image',
      cmd_arguments: [],
      envVars: [],
      secrets: [],
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
    }

    const result = prepareUpdateWorkloadData(data)

    expect(result.secrets).toEqual([])
  })
})
