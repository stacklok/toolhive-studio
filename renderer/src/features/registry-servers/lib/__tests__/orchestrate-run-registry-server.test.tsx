import { it, expect, vi, describe } from 'vitest'
import type { RegistryImageMetadata } from '@common/api/registry-types'
import { prepareCreateWorkloadData } from '../orchestrate-run-registry-server'
import type { FormSchemaRegistryMcp } from '../form-schema-registry-mcp'

const REGISTRY_SERVER: RegistryImageMetadata = {
  name: 'test-server',
  image: 'ghcr.io/test/server:latest',
  description: 'Test server',
  transport: 'stdio',
  permissions: {},
  tools: ['tool-1'],
  env_vars: [],
  args: [],
  metadata: {},
  repository_url: 'https://github.com/test/server',
  tags: ['test'],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('prepareCreateWorkloadData', () => {
  const SERVER: RegistryImageMetadata = {
    name: 'test-server',
    image: 'test-image',
    transport: 'stdio',
    target_port: 8080,
  }

  it('prepares workload data with all fields', () => {
    const data: FormSchemaRegistryMcp = {
      proxy_mode: 'streamable-http',
      name: 'Test Server',
      group: 'default',
      envVars: [
        { name: 'DEBUG', value: 'true' },
        { name: 'PORT', value: '8080' },
      ],
      secrets: [],
      cmd_arguments: ['--debug', '--port', '8080'],
      networkAccess: 'none',
      allowedDestinations: 'anywhere',
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
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
      proxy_mode: 'streamable-http',
      proxy_port: undefined,
      env_vars: { DEBUG: 'true', PORT: '8080' },
      secrets,
      cmd_arguments: ['--debug', '--port', '8080'],
      target_port: 8080,
      network_isolation: false,
      volumes: [],
      registry: 'default',
      server: 'test-server',
    })
  })

  it('handles empty env vars and secrets', () => {
    const data: FormSchemaRegistryMcp = {
      proxy_mode: 'streamable-http',
      name: 'Test Server',
      group: 'default',
      envVars: [],
      secrets: [],
      networkAccess: 'none',
      allowedDestinations: 'anywhere',
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
    }

    const result = prepareCreateWorkloadData(SERVER, data)

    expect(result).toEqual({
      name: 'Test Server',
      image: 'test-image',
      transport: 'stdio',
      proxy_mode: 'streamable-http',
      proxy_port: undefined,
      env_vars: {},
      secrets: [],
      cmd_arguments: [],
      target_port: 8080,
      network_isolation: false,
      volumes: [],
      registry: 'default',
      server: 'test-server',
    })
  })

  it('tags the request with the registry source so the API runs the registry-resolution path', () => {
    const data: FormSchemaRegistryMcp = {
      proxy_mode: 'streamable-http',
      name: 'My Custom github',
      group: 'default',
      envVars: [],
      secrets: [],
      networkAccess: 'none',
      allowedDestinations: 'anywhere',
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
    }

    const result = prepareCreateWorkloadData(SERVER, data)

    // Workload name comes from the form (user-editable); registry entry name
    // comes from the canonical server metadata. They are deliberately distinct
    // so the API can resolve registry defaults even when the user renames the
    // workload at install time.
    expect(result.name).toBe('My Custom github')
    expect(result.registry).toBe('default')
    expect(result.server).toBe('test-server')
  })

  it('handles empty cmd_arguments', () => {
    const data: FormSchemaRegistryMcp = {
      proxy_mode: 'streamable-http',
      name: 'Test Server',
      group: 'default',
      envVars: [],
      secrets: [],
      cmd_arguments: [],
      networkAccess: 'none',
      allowedDestinations: 'anywhere',
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
    }

    const result = prepareCreateWorkloadData(SERVER, data)

    expect(result.cmd_arguments).toEqual([])
  })

  it('handles undefined cmd_arguments', () => {
    const data: FormSchemaRegistryMcp = {
      proxy_mode: 'streamable-http',
      name: 'Test Server',
      group: 'default',
      envVars: [],
      secrets: [],
      cmd_arguments: undefined,
      networkAccess: 'none',
      allowedDestinations: 'anywhere',
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
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

    const data: FormSchemaRegistryMcp = {
      proxy_mode: 'streamable-http',
      name: 'Test Server',
      group: 'default',
      envVars: [],
      secrets: [],
      networkAccess: 'none',
      allowedDestinations: 'anywhere',
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
    }

    const result = prepareCreateWorkloadData(serverWithoutPort, data)

    expect(result.target_port).toBeUndefined()
  })

  it('filters out environment variables with empty values', () => {
    const data: FormSchemaRegistryMcp = {
      proxy_mode: 'streamable-http',
      name: 'Test Server',
      group: 'default',
      envVars: [
        { name: 'DEBUG', value: 'true' },
        { name: 'PORT', value: '8080' },
        { name: 'OPTIONAL_VAR', value: '' }, // Empty value should be omitted
        { name: 'ANOTHER_OPTIONAL', value: '   ' }, // Whitespace-only should be omitted
        { name: 'REQUIRED_VAR', value: 'some-value' },
      ],
      secrets: [],
      networkAccess: 'none',
      allowedDestinations: 'anywhere',
      allowedHosts: [],
      allowedPorts: [],
      volumes: [],
    }

    const result = prepareCreateWorkloadData(SERVER, data)

    expect(result.env_vars).toEqual({
      DEBUG: 'true',
      PORT: '8080',
      REQUIRED_VAR: 'some-value',
    })
    // OPTIONAL_VAR and ANOTHER_OPTIONAL should be omitted
    expect(result.env_vars).not.toContain('OPTIONAL_VAR=')
    expect(result.env_vars).not.toContain('ANOTHER_OPTIONAL=')
  })

  it('includes network isolation data when enabled', () => {
    const data: FormSchemaRegistryMcp = {
      proxy_mode: 'streamable-http',
      name: 'test-server',
      group: 'default',
      cmd_arguments: [],
      secrets: [],
      envVars: [],
      networkAccess: 'proxy',
      allowedDestinations: 'selected',
      allowedHosts: [{ value: 'example.com' }, { value: '.subdomain.com' }],
      allowedPorts: [{ value: '8080' }, { value: '443' }],
      volumes: [],
    }

    const result = prepareCreateWorkloadData(REGISTRY_SERVER, data)

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
    const data: FormSchemaRegistryMcp = {
      proxy_mode: 'streamable-http',
      name: 'test-server',
      group: 'default',
      cmd_arguments: [],
      secrets: [],
      envVars: [],
      networkAccess: 'none',
      allowedDestinations: 'anywhere',
      allowedHosts: [{ value: 'example.com' }],
      allowedPorts: [{ value: '8080' }],
      volumes: [],
    }

    const result = prepareCreateWorkloadData(REGISTRY_SERVER, data)

    expect(result.network_isolation).toBe(false)
    expect(result.permission_profile).toBeUndefined()
  })
})
