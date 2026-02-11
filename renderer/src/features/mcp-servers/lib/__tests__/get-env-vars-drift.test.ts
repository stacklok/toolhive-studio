import { describe, it, expect } from 'vitest'
import { getEnvVarsDrift } from '../get-env-vars-drift'
import type {
  RegistryEnvVar,
  V1CreateRequest,
} from '@common/api/generated/types.gen'

describe('getEnvVarsDrift', () => {
  it('returns null when registry has no env vars', () => {
    const result = getEnvVarsDrift(undefined, {
      env_vars: { FOO: 'bar' },
    })
    expect(result).toBeNull()
  })

  it('returns null when registry env vars array is empty', () => {
    const result = getEnvVarsDrift([], {
      env_vars: { FOO: 'bar' },
    })
    expect(result).toBeNull()
  })

  it('returns null when there is no drift', () => {
    const registryEnvVars: RegistryEnvVar[] = [
      { name: 'API_KEY', required: true, secret: true },
      { name: 'LOG_LEVEL', required: false, secret: false },
    ]
    const workloadData: V1CreateRequest = {
      env_vars: { LOG_LEVEL: 'debug' },
      secrets: [{ name: 'api-key-store', target: 'API_KEY' }],
    }

    const result = getEnvVarsDrift(registryEnvVars, workloadData)
    expect(result).toBeNull()
  })

  it('detects added env vars from registry', () => {
    const registryEnvVars: RegistryEnvVar[] = [
      { name: 'API_KEY', required: true, secret: true },
      { name: 'NEW_VAR', required: false, secret: false },
      { name: 'EXISTING', required: false, secret: false },
    ]
    const workloadData: V1CreateRequest = {
      env_vars: { EXISTING: 'value' },
      secrets: [],
    }

    const result = getEnvVarsDrift(registryEnvVars, workloadData)

    expect(result).not.toBeNull()
    expect(result!.added).toEqual([
      { name: 'API_KEY', required: true, secret: true },
      { name: 'NEW_VAR', required: false, secret: false },
    ])
    expect(result!.removed).toEqual([])
  })

  it('detects removed env vars not in registry', () => {
    const registryEnvVars: RegistryEnvVar[] = [
      { name: 'API_KEY', required: true, secret: false },
    ]
    const workloadData: V1CreateRequest = {
      env_vars: { API_KEY: 'key', OLD_VAR: 'value' },
      secrets: [{ name: 'old-secret', target: 'OLD_SECRET' }],
    }

    const result = getEnvVarsDrift(registryEnvVars, workloadData)

    expect(result).not.toBeNull()
    expect(result!.added).toEqual([])
    expect(result!.removed).toEqual([
      { name: 'OLD_VAR', secret: false },
      { name: 'OLD_SECRET', secret: true },
    ])
  })

  it('detects both added and removed vars', () => {
    const registryEnvVars: RegistryEnvVar[] = [
      { name: 'NEW_REQUIRED', required: true, secret: false },
      { name: 'KEPT', required: false, secret: false },
    ]
    const workloadData: V1CreateRequest = {
      env_vars: { KEPT: 'value', REMOVED: 'old' },
      secrets: [],
    }

    const result = getEnvVarsDrift(registryEnvVars, workloadData)

    expect(result).not.toBeNull()
    expect(result!.added).toEqual([
      { name: 'NEW_REQUIRED', required: true, secret: false },
    ])
    expect(result!.removed).toEqual([{ name: 'REMOVED', secret: false }])
  })

  it('handles workload with no env_vars or secrets', () => {
    const registryEnvVars: RegistryEnvVar[] = [
      { name: 'API_KEY', required: true, secret: true },
    ]
    const workloadData: V1CreateRequest = {}

    const result = getEnvVarsDrift(registryEnvVars, workloadData)

    expect(result).not.toBeNull()
    expect(result!.added).toEqual([
      { name: 'API_KEY', required: true, secret: true },
    ])
    expect(result!.removed).toEqual([])
  })

  it('matches secrets by target field', () => {
    const registryEnvVars: RegistryEnvVar[] = [
      { name: 'DB_PASSWORD', required: true, secret: true },
    ]
    const workloadData: V1CreateRequest = {
      env_vars: {},
      secrets: [{ name: 'db-password-key', target: 'DB_PASSWORD' }],
    }

    const result = getEnvVarsDrift(registryEnvVars, workloadData)
    expect(result).toBeNull()
  })

  it('skips registry env vars with no name', () => {
    const registryEnvVars: RegistryEnvVar[] = [
      { required: true, secret: false },
      { name: 'VALID', required: false, secret: false },
    ]
    const workloadData: V1CreateRequest = {
      env_vars: { VALID: 'yes' },
    }

    const result = getEnvVarsDrift(registryEnvVars, workloadData)
    expect(result).toBeNull()
  })
})
