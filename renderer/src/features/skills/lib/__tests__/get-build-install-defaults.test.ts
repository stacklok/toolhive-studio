import { describe, expect, it } from 'vitest'
import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'
import { getBuildInstallDefaults } from '../build-reference'

describe('getBuildInstallDefaults', () => {
  it('uses build.name and build.version when both are present', () => {
    const build: LocalBuild = {
      name: 'my-skill',
      tag: 'localhost/my-skill:v1.0.0',
      version: 'v1.0.0',
    }

    expect(getBuildInstallDefaults(build)).toEqual({
      reference: 'my-skill',
      version: 'v1.0.0',
    })
  })

  it('falls back to splitting build.tag for both reference and version when build.name is absent', () => {
    const build: LocalBuild = {
      tag: 'localhost/my-skill:v1.0.0',
    }

    expect(getBuildInstallDefaults(build)).toEqual({
      reference: 'localhost/my-skill',
      version: 'v1.0.0',
    })
  })

  it('falls back to splitting build.tag for the version when build.version is absent', () => {
    const build: LocalBuild = {
      name: 'my-skill',
      tag: 'localhost/my-skill:v2.3.4',
    }

    expect(getBuildInstallDefaults(build)).toEqual({
      reference: 'my-skill',
      version: 'v2.3.4',
    })
  })

  it('extracts a sha256 digest from build.tag as the version', () => {
    const build: LocalBuild = {
      name: 'my-skill',
      tag: 'localhost/my-skill@sha256:deadbeef',
    }

    expect(getBuildInstallDefaults(build)).toEqual({
      reference: 'my-skill',
      version: 'sha256:deadbeef',
    })
  })

  it('returns the bare tag as reference and undefined version when no tag/version info is present', () => {
    const build: LocalBuild = {
      tag: 'localhost/my-skill',
    }

    expect(getBuildInstallDefaults(build)).toEqual({
      reference: 'localhost/my-skill',
      version: undefined,
    })
  })

  it('prefers the explicit build.version over the tag suffix', () => {
    const build: LocalBuild = {
      name: 'my-skill',
      tag: 'localhost/my-skill:latest',
      version: 'v9.9.9',
    }

    expect(getBuildInstallDefaults(build)).toEqual({
      reference: 'my-skill',
      version: 'v9.9.9',
    })
  })

  it('returns undefined for both fields when the build has nothing usable', () => {
    const build: LocalBuild = {}

    expect(getBuildInstallDefaults(build)).toEqual({
      reference: undefined,
      version: undefined,
    })
  })

  it('treats a bare version-only tag as the version when build.name covers the reference', () => {
    const build: LocalBuild = {
      name: 'toolhive-studio-pr-review',
      tag: 'v0.0.1',
    }

    expect(getBuildInstallDefaults(build)).toEqual({
      reference: 'toolhive-studio-pr-review',
      version: 'v0.0.1',
    })
  })

  it('treats a non-semver bare tag like "latest" as the version when build.name covers the reference', () => {
    const build: LocalBuild = {
      name: 'my-skill',
      tag: 'latest',
    }

    expect(getBuildInstallDefaults(build)).toEqual({
      reference: 'my-skill',
      version: 'latest',
    })
  })

  it('does not treat a tag equal to the name as a version', () => {
    const build: LocalBuild = {
      name: 'my-skill',
      tag: 'my-skill',
    }

    expect(getBuildInstallDefaults(build)).toEqual({
      reference: 'my-skill',
      version: undefined,
    })
  })

  it('does not treat a bare OCI reference tag as a version (no slash heuristic)', () => {
    const build: LocalBuild = {
      name: 'my-skill',
      tag: 'ghcr.io/org/my-skill',
    }

    expect(getBuildInstallDefaults(build)).toEqual({
      reference: 'my-skill',
      version: undefined,
    })
  })
})
