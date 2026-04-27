import { describe, it, expect } from 'vitest'
import { parseSkillBuildResult } from '../parse-skill-build-result'

describe('parseSkillBuildResult', () => {
  it('returns null for non-object inputs', () => {
    expect(parseSkillBuildResult(null)).toBeNull()
    expect(parseSkillBuildResult(undefined)).toBeNull()
    expect(parseSkillBuildResult('build complete')).toBeNull()
    expect(parseSkillBuildResult(42)).toBeNull()
  })

  it('returns null when reference is missing or empty', () => {
    expect(parseSkillBuildResult({})).toBeNull()
    expect(parseSkillBuildResult({ reference: '' })).toBeNull()
    expect(parseSkillBuildResult({ reference: 123 })).toBeNull()
  })

  it('parses a full build payload with all fields populated', () => {
    const result = parseSkillBuildResult({
      reference: 'ghcr.io/example/my-skill:v0.0.4',
      apiReference: 'ghcr.io/example/my-skill:v0.0.4',
      build: {
        name: 'my-skill',
        description: 'Does cool things',
        tag: 'ghcr.io/example/my-skill:v0.0.4',
        version: 'v0.0.4',
        digest: 'sha256:deadbeef',
      },
    })

    expect(result).toEqual({
      reference: 'ghcr.io/example/my-skill:v0.0.4',
      apiReference: 'ghcr.io/example/my-skill:v0.0.4',
      build: {
        name: 'my-skill',
        description: 'Does cool things',
        tag: 'ghcr.io/example/my-skill:v0.0.4',
        version: 'v0.0.4',
        digest: 'sha256:deadbeef',
      },
    })
  })

  it('falls back to apiReference when build.tag is missing', () => {
    const result = parseSkillBuildResult({
      reference: 'my-skill',
      apiReference: 'ghcr.io/example/my-skill:v1',
      build: {
        name: 'my-skill',
        version: 'v1',
      },
    })

    expect(result?.build.tag).toBe('ghcr.io/example/my-skill:v1')
    expect(result?.apiReference).toBe('ghcr.io/example/my-skill:v1')
  })

  it('falls back to top-level tag when build is absent and apiReference is missing', () => {
    const result = parseSkillBuildResult({
      reference: 'my-skill',
      tag: 'ghcr.io/example/my-skill:latest',
    })

    expect(result?.build.tag).toBe('ghcr.io/example/my-skill:latest')
    expect(result?.apiReference).toBeUndefined()
  })

  it('drops empty-string fields rather than carrying them through', () => {
    const result = parseSkillBuildResult({
      reference: 'my-skill',
      build: {
        name: '',
        description: '',
        tag: 'ghcr.io/example/my-skill:v1',
        version: '',
        digest: '',
      },
    })

    expect(result?.build).toEqual({
      name: undefined,
      description: undefined,
      tag: 'ghcr.io/example/my-skill:v1',
      version: undefined,
      digest: undefined,
    })
  })

  it('ignores a non-object build value', () => {
    const result = parseSkillBuildResult({
      reference: 'my-skill',
      apiReference: 'ghcr.io/example/my-skill:v1',
      build: 'not-an-object',
    })

    expect(result).not.toBeNull()
    expect(result?.build).toEqual({
      name: undefined,
      description: undefined,
      tag: 'ghcr.io/example/my-skill:v1',
      version: undefined,
      digest: undefined,
    })
  })
})
