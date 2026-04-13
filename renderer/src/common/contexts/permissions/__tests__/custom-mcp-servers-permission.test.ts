import { describe, it, expect } from 'vitest'
import { PERMISSION_KEYS } from '../permission-keys'
import { DEFAULT_PERMISSIONS } from '..'

describe('non-registry-servers permission key', () => {
  it('exists in PERMISSION_KEYS', () => {
    expect(PERMISSION_KEYS.NON_REGISTRY_SERVERS).toBe('non-registry-servers')
  })

  it('defaults to true in DEFAULT_PERMISSIONS', () => {
    expect(DEFAULT_PERMISSIONS['non-registry-servers']).toBe(true)
  })
})
