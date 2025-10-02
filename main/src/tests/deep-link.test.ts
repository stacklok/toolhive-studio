import { describe, it, expect } from 'vitest'
import {
  parseDeepLink,
  generateInstallServerLink,
  generateCliCommand,
} from '../deep-link'

describe('Deep Link Parser', () => {
  it('should parse basic install-server URL', () => {
    const url = 'toolhive://install-server?server=github-mcp-server'
    const result = parseDeepLink(url)

    expect(result).toEqual({
      action: 'install-server',
      serverName: 'github-mcp-server',
    })
  })

  it('should parse URL with registry and environment variables', () => {
    const url =
      'toolhive://install-server?server=github-mcp-server&registry=official&env_GITHUB_REPO=owner/repo&env_DEBUG=true'
    const result = parseDeepLink(url)

    expect(result).toEqual({
      action: 'install-server',
      serverName: 'github-mcp-server',
      registryName: 'official',
      environment: {
        GITHUB_REPO: 'owner/repo',
        DEBUG: 'true',
      },
    })
  })

  it('should parse URL with secrets', () => {
    const url =
      'toolhive://install-server?server=api-server&secret_API_KEY=test-key&secret_TOKEN=test-token'
    const result = parseDeepLink(url)

    expect(result).toEqual({
      action: 'install-server',
      serverName: 'api-server',
      secrets: {
        API_KEY: 'test-key',
        TOKEN: 'test-token',
      },
    })
  })

  it('should handle configure-server action', () => {
    const url = 'toolhive://configure-server?server=my-server&env_DEBUG=true'
    const result = parseDeepLink(url)

    expect(result).toEqual({
      action: 'configure-server',
      serverName: 'my-server',
      environment: {
        DEBUG: 'true',
      },
    })
  })

  it('should handle view-server action', () => {
    const url = 'toolhive://view-server?server=my-server&group=production'
    const result = parseDeepLink(url)

    expect(result).toEqual({
      action: 'view-server',
      serverName: 'my-server',
      group: 'production',
    })
  })

  it('should return null for invalid protocol', () => {
    const url = 'https://example.com/install-server?server=test'
    const result = parseDeepLink(url)

    expect(result).toBeNull()
  })

  it('should return null for malformed URL', () => {
    const url = 'not-a-url'
    const result = parseDeepLink(url)

    expect(result).toBeNull()
  })
})

describe('Deep Link Generator', () => {
  it('should generate basic install server link', () => {
    const link = generateInstallServerLink('github-mcp-server')

    expect(link).toBe('toolhive://install-server?server=github-mcp-server')
  })

  it('should generate link with registry', () => {
    const link = generateInstallServerLink('github-mcp-server', 'official')

    expect(link).toBe(
      'toolhive://install-server?server=github-mcp-server&registry=official'
    )
  })

  it('should generate link with environment variables', () => {
    const environment = { GITHUB_REPO: 'owner/repo', DEBUG: 'true' }
    const link = generateInstallServerLink(
      'github-mcp-server',
      undefined,
      environment
    )

    expect(link).toBe(
      'toolhive://install-server?server=github-mcp-server&env_GITHUB_REPO=owner%2Frepo&env_DEBUG=true'
    )
  })

  it('should generate link with secrets', () => {
    const secrets = { API_KEY: 'test-key', TOKEN: 'test-token' }
    const link = generateInstallServerLink(
      'api-server',
      undefined,
      undefined,
      secrets
    )

    expect(link).toBe(
      'toolhive://install-server?server=api-server&secret_API_KEY=test-key&secret_TOKEN=test-token'
    )
  })

  it('should generate complete link with all parameters', () => {
    const environment = { DEBUG: 'true' }
    const secrets = { API_KEY: 'test-key' }
    const link = generateInstallServerLink(
      'test-server',
      'official',
      environment,
      secrets
    )

    expect(link).toBe(
      'toolhive://install-server?server=test-server&registry=official&env_DEBUG=true&secret_API_KEY=test-key'
    )
  })
})

describe('CLI Command Generator', () => {
  it('should generate basic CLI command', () => {
    const command = generateCliCommand('github-mcp-server')

    expect(command).toBe('thv run github-mcp-server')
  })

  it('should generate command with registry', () => {
    const command = generateCliCommand('github-mcp-server', 'official')

    expect(command).toBe('thv run --registry official github-mcp-server')
  })

  it('should generate command with environment variables', () => {
    const environment = { GITHUB_REPO: 'owner/repo', DEBUG: 'true' }
    const command = generateCliCommand(
      'github-mcp-server',
      undefined,
      environment
    )

    expect(command).toBe(
      'thv run github-mcp-server --env GITHUB_REPO=owner/repo --env DEBUG=true'
    )
  })

  it('should generate command with secrets placeholders', () => {
    const secrets = { API_KEY: 'test-key', GITHUB_TOKEN: 'test-token' }
    const command = generateCliCommand(
      'api-server',
      undefined,
      undefined,
      secrets
    )

    expect(command).toBe(
      'thv run api-server --secret API_KEY=<your-api-key> --secret GITHUB_TOKEN=<your-github-token>'
    )
  })

  it('should generate complete command with all parameters', () => {
    const environment = { DEBUG: 'true' }
    const secrets = { API_KEY: 'test-key' }
    const command = generateCliCommand(
      'test-server',
      'official',
      environment,
      secrets
    )

    expect(command).toBe(
      'thv run --registry official test-server --env DEBUG=true --secret API_KEY=<your-api-key>'
    )
  })
})
