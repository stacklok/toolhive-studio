import { describe, expect, it } from 'vitest'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { getSkillInstallReference } from '../skill-reference'

describe('getSkillInstallReference', () => {
  it('returns the OCI identifier unchanged when it already includes a tag', () => {
    const skill: RegistrySkill = {
      name: 'my-skill',
      namespace: 'io.github.user',
      version: 'v1.0.0',
      packages: [
        { registryType: 'oci', identifier: 'ghcr.io/org/my-skill:v1.0.0' },
      ],
    }

    expect(getSkillInstallReference(skill)).toBe('ghcr.io/org/my-skill:v1.0.0')
  })

  it('appends the registry version to an OCI identifier without a tag', () => {
    const skill: RegistrySkill = {
      name: 'my-skill',
      namespace: 'io.github.user',
      version: 'v1.0.0',
      packages: [{ registryType: 'oci', identifier: 'ghcr.io/org/my-skill' }],
    }

    expect(getSkillInstallReference(skill)).toBe('ghcr.io/org/my-skill:v1.0.0')
  })

  it('falls back to namespace/name for non-OCI registry skills', () => {
    const skill: RegistrySkill = {
      name: 'git-skill',
      namespace: 'io.github.other',
      version: 'v2.0.0',
      packages: [{ registryType: 'git', identifier: 'https://github.com/x/y' }],
    }

    expect(getSkillInstallReference(skill)).toBe('io.github.other/git-skill')
  })
})
