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

  it('should parse URL with registry', () => {
    const url =
      'toolhive://install-server?server=github-mcp-server&registry=official'
    const result = parseDeepLink(url)

    expect(result).toEqual({
      action: 'install-server',
      serverName: 'github-mcp-server',
      registryName: 'official',
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
})
