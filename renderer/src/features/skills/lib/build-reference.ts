import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'
import { parseSkillReference } from './skill-reference'

export function getBuildTitle(build: LocalBuild): string {
  return build.name?.trim() || build.tag?.trim() || 'Unnamed build'
}

interface BuildInstallDefaults {
  /**
   * Bare reference to prefill in the install dialog's name field. The
   * tag suffix (e.g. `:v1.0.0`) is stripped so it doesn't get baked into
   * the name. Falls back to `build.tag` (already-bare) and finally to
   * `build.name` when the tag is unavailable.
   */
  reference: string | undefined
  /**
   * Version to prefill in the install dialog's version field. Resolution
   * order: explicit `build.version` (from artifact metadata) -> the tag
   * portion parsed out of `build.tag` (e.g. `v1.0.0` from
   * `localhost/my-skill:v1.0.0`) -> the whole `build.tag` when it is a
   * bare version-only string and `build.name` already covers the
   * reference (e.g. `name="my-skill"`, `tag="v0.0.1"`).
   */
  version: string | undefined
}

/**
 * Derives the values to prefill in the install dialog when installing a
 * locally built skill. Mirrors `getSkillInstallDefaults` for registry
 * skills: the OCI tag is split out so the version lives in its own
 * field instead of being baked into the reference.
 */
export function getBuildInstallDefaults(
  build: LocalBuild
): BuildInstallDefaults {
  const tag = build.tag
  const parsedTag = tag ? parseSkillReference(tag) : undefined

  if (build.name) {
    // When build.name covers the reference, a leftover tag that isn't
    // the same as the name and carries no parseable suffix is best
    // interpreted as the version itself (e.g. `name="my-skill"`,
    // `tag="v0.0.1"` -> version "v0.0.1").
    const tagAsVersion =
      tag && tag !== build.name && !parsedTag?.version ? tag : undefined

    return {
      reference: build.name,
      version: build.version ?? parsedTag?.version ?? tagAsVersion,
    }
  }

  return {
    reference: parsedTag?.reference ?? tag,
    version: build.version ?? parsedTag?.version,
  }
}
