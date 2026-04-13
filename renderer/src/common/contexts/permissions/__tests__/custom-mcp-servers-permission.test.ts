import { describe, it, expect } from 'vitest'
import { PERMISSION_KEYS } from '../permission-keys'
import { DEFAULT_PERMISSIONS } from '..'

describe('custom-mcp-servers permission key', () => {
  it('exists in PERMISSION_KEYS', () => {
    expect(PERMISSION_KEYS.CUSTOM_MCP_SERVERS).toBe('custom-mcp-servers')
  })

  it('defaults to true in DEFAULT_PERMISSIONS', () => {
    expect(DEFAULT_PERMISSIONS['custom-mcp-servers']).toBe(true)
  })
})
