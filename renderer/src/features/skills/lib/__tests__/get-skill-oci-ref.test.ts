import { expect, it, describe } from 'vitest'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { getSkillOciRef } from '../skill-reference'

describe('getSkillOciRef', () => {
  it('returns undefined when skill has no packages, namespace, or name', () => {
    expect(getSkillOciRef({})).toBeUndefined()
  })

  it('returns the identifier of the first OCI package', () => {
    const skill: RegistrySkill = {
      namespace: 'io.github.stacklok',
      name: 'my-skill',
      packages: [
        { registryType: 'oci', identifier: 'ghcr.io/org/my-skill:v1' },
      ],
    }
    expect(getSkillOciRef(skill)).toBe('ghcr.io/org/my-skill:v1')
  })

  it('skips OCI packages that have no identifier', () => {
    const skill: RegistrySkill = {
      namespace: 'io.github.stacklok',
      name: 'my-skill',
      packages: [
        { registryType: 'oci' },
        { registryType: 'oci', identifier: 'ghcr.io/org/my-skill:v2' },
      ],
    }
    expect(getSkillOciRef(skill)).toBe('ghcr.io/org/my-skill:v2')
  })

  it('falls back to namespace/name when there are only git packages (catalog skills)', () => {
    const skill: RegistrySkill = {
      namespace: 'io.github.stacklok',
      name: 'skill-creator',
      packages: [
        {
          registryType: 'git',
          url: 'https://github.com/stacklok/toolhive-catalog',
          subfolder: 'registries/toolhive/skills/skill-creator',
        },
      ],
    }
    expect(getSkillOciRef(skill)).toBe('io.github.stacklok/skill-creator')
  })

  it('falls back to namespace/name when packages is empty', () => {
    const skill: RegistrySkill = {
      namespace: 'io.github.stacklok',
      name: 'my-skill',
      packages: [],
    }
    expect(getSkillOciRef(skill)).toBe('io.github.stacklok/my-skill')
  })

  it('prefers OCI identifier over namespace/name fallback', () => {
    const skill: RegistrySkill = {
      namespace: 'io.github.stacklok',
      name: 'my-skill',
      packages: [
        {
          registryType: 'git',
          url: 'https://github.com/stacklok/toolhive-catalog',
        },
        { registryType: 'oci', identifier: 'ghcr.io/org/my-skill:v1' },
      ],
    }
    expect(getSkillOciRef(skill)).toBe('ghcr.io/org/my-skill:v1')
  })

  it('returns undefined when no packages and no namespace/name', () => {
    expect(
      getSkillOciRef({ packages: [{ registryType: 'oci' }] })
    ).toBeUndefined()
  })
})
