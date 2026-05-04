import { describe, expect, it } from 'vitest'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { getSkillInstallDefaults } from '../skill-reference'

describe('getSkillInstallDefaults', () => {
  it('splits a tagged OCI identifier into a bare reference and version', () => {
    const skill: RegistrySkill = {
      name: 'my-skill',
      namespace: 'io.github.user',
      version: 'v1.0.0',
      packages: [
        { registryType: 'oci', identifier: 'ghcr.io/org/my-skill:v1.0.0' },
      ],
    }

    expect(getSkillInstallDefaults(skill)).toEqual({
      reference: 'ghcr.io/org/my-skill',
      version: 'v1.0.0',
    })
  })

  it('splits an OCI identifier with a digest into reference and version', () => {
    const skill: RegistrySkill = {
      name: 'my-skill',
      namespace: 'io.github.user',
      packages: [
        {
          registryType: 'oci',
          identifier: 'ghcr.io/org/my-skill@sha256:deadbeef',
        },
      ],
    }

    expect(getSkillInstallDefaults(skill)).toEqual({
      reference: 'ghcr.io/org/my-skill',
      version: 'sha256:deadbeef',
    })
  })

  it('falls back to skill.version when the bare OCI identifier has no ref', () => {
    const skill: RegistrySkill = {
      name: 'my-skill',
      namespace: 'io.github.user',
      version: 'v1.0.0',
      packages: [{ registryType: 'oci', identifier: 'ghcr.io/org/my-skill' }],
    }

    expect(getSkillInstallDefaults(skill)).toEqual({
      reference: 'ghcr.io/org/my-skill',
      version: 'v1.0.0',
    })
  })

  it('returns no version when bare OCI identifier has no ref and skill has no version', () => {
    const skill: RegistrySkill = {
      name: 'my-skill',
      namespace: 'io.github.user',
      packages: [{ registryType: 'oci', identifier: 'ghcr.io/org/my-skill' }],
    }

    expect(getSkillInstallDefaults(skill)).toEqual({
      reference: 'ghcr.io/org/my-skill',
      version: undefined,
    })
  })

  it('uses the package ref as the version when the OCI identifier is bare', () => {
    const skill: RegistrySkill = {
      name: 'my-skill',
      namespace: 'io.github.user',
      version: 'v1.0.0',
      packages: [
        {
          registryType: 'oci',
          identifier: 'ghcr.io/org/my-skill',
          ref: 'v2.3.4',
        },
      ],
    }

    expect(getSkillInstallDefaults(skill)).toEqual({
      reference: 'ghcr.io/org/my-skill',
      version: 'v2.3.4',
    })
  })

  it('uses an OCI digest ref as the version when the identifier is bare', () => {
    const skill: RegistrySkill = {
      name: 'my-skill',
      namespace: 'io.github.user',
      packages: [
        {
          registryType: 'oci',
          identifier: 'ghcr.io/org/my-skill',
          ref: 'sha256:deadbeef',
        },
      ],
    }

    expect(getSkillInstallDefaults(skill)).toEqual({
      reference: 'ghcr.io/org/my-skill',
      version: 'sha256:deadbeef',
    })
  })

  it('falls back to namespace/name and skill.version for non-OCI registry skills', () => {
    const skill: RegistrySkill = {
      name: 'git-skill',
      namespace: 'io.github.other',
      version: 'v2.0.0',
      packages: [{ registryType: 'git', identifier: 'https://github.com/x/y' }],
    }

    expect(getSkillInstallDefaults(skill)).toEqual({
      reference: 'io.github.other/git-skill',
      version: 'v2.0.0',
    })
  })

  it('returns no version for non-OCI registry skills without a version', () => {
    const skill: RegistrySkill = {
      name: 'git-skill',
      namespace: 'io.github.other',
      packages: [{ registryType: 'git', identifier: 'https://github.com/x/y' }],
    }

    expect(getSkillInstallDefaults(skill)).toEqual({
      reference: 'io.github.other/git-skill',
      version: undefined,
    })
  })
})
