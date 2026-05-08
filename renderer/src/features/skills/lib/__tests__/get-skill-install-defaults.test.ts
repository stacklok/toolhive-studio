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

  it('falls back to the bare skill name and skill.version for non-OCI registry skills', () => {
    const skill: RegistrySkill = {
      name: 'git-skill',
      namespace: 'io.github.other',
      version: 'v2.0.0',
      packages: [{ registryType: 'git', identifier: 'https://github.com/x/y' }],
    }

    expect(getSkillInstallDefaults(skill)).toEqual({
      reference: 'git-skill',
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
      reference: 'git-skill',
      version: undefined,
    })
  })

  it('uses the bare name (not namespace/name) for git-package-only skills so the install backend can resolve them via the index', () => {
    // Regression for #2208: the install backend rejects `namespace/name`
    // values because it interprets the `/` as an OCI reference and tries
    // to dial the namespace as a registry host.
    const skill: RegistrySkill = {
      name: 'skill-creator',
      namespace: 'io.github.stacklok',
      version: '0.1.0',
      packages: [
        {
          registryType: 'git',
          url: 'https://github.com/stacklok/toolhive-catalog',
          ref: 'main',
          subfolder: 'registries/toolhive/skills/skill-creator/skill',
        },
      ],
    }

    expect(getSkillInstallDefaults(skill)).toEqual({
      reference: 'skill-creator',
      version: '0.1.0',
    })
  })
})
