import type { RegistrySkill } from '@common/api/generated/types.gen'
import type { RegistrySkillPackage } from '@common/api/generated/types.gen'

function getOciPackage(skill: RegistrySkill): RegistrySkillPackage | undefined {
  return skill.packages?.find(
    (pkg) => pkg.registryType === 'oci' && pkg.identifier
  )
}

function getOciPackageReference(skill: RegistrySkill): string | undefined {
  return getOciPackage(skill)?.identifier
}

function getNamespaceNameReference(skill: RegistrySkill): string | undefined {
  if (skill.namespace && skill.name) {
    return `${skill.namespace}/${skill.name}`
  }

  return undefined
}

interface ParsedSkillReference {
  reference: string
  version?: string
}

/**
 * Splits a skill reference into the bare reference and an optional
 * version (OCI tag or digest). Returns the original input as `reference`
 * with no `version` when no version suffix is present.
 *
 * Examples:
 * - "ghcr.io/org/skill:v1.0.0" -> { reference: "ghcr.io/org/skill", version: "v1.0.0" }
 * - "ghcr.io/org/skill@sha256:deadbeef" -> { reference: "ghcr.io/org/skill", version: "sha256:deadbeef" }
 * - "ghcr.io/org/skill" -> { reference: "ghcr.io/org/skill" }
 */
export function parseSkillReference(reference: string): ParsedSkillReference {
  const digestIndex = reference.indexOf('@')
  if (digestIndex !== -1) {
    return {
      reference: reference.slice(0, digestIndex),
      version: reference.slice(digestIndex + 1),
    }
  }

  const lastSlashIndex = reference.lastIndexOf('/')
  const lastColonIndex = reference.lastIndexOf(':')
  if (lastColonIndex > lastSlashIndex) {
    return {
      reference: reference.slice(0, lastColonIndex),
      version: reference.slice(lastColonIndex + 1),
    }
  }

  return { reference }
}

/**
 * Derives the ref to use for fetching SKILL.md content via the content API.
 * Prefers the identifier of the first OCI package. Falls back to
 * `namespace/name` (e.g. "io.github.stacklok/skill-creator") since the
 * content endpoint accepts that format directly. Git package URLs are the
 * catalog repo, not a per-skill ref, so they are intentionally ignored.
 */
export function getSkillOciRef(skill: RegistrySkill): string | undefined {
  return getOciPackageReference(skill) ?? getNamespaceNameReference(skill)
}

interface SkillInstallDefaults {
  /**
   * The bare reference to prefill in the install dialog's name field,
   * with any version/tag/digest suffix stripped.
   */
  reference: string
  /**
   * The version to prefill in the install dialog's version field,
   * derived (in order) from the OCI tag/digest, the package `ref`
   * field, or the top-level `skill.version`. Undefined when no version
   * information is available anywhere on the skill.
   */
  version?: string
}

/**
 * Derives the values to prefill in the install dialog. The OCI identifier
 * is split so the version (tag or digest) lives in its own field rather
 * than being baked into the reference. Falls back to the bare `skill.name`
 * when no OCI package identifier is available — i.e. when the skill has
 * no `registryType: 'oci'` package, or the OCI package carries no
 * `identifier`. The install backend resolves bare names against the
 * registry index, while a `namespace/name` value would be misinterpreted
 * as an OCI reference and fail with a DNS error. The version field falls
 * back to `skill.version` (the same value shown as a badge on the detail
 * page) when the OCI package carries no tag/digest/ref of its own.
 */
export function getSkillInstallDefaults(
  skill: RegistrySkill
): SkillInstallDefaults {
  const ociPackage = getOciPackage(skill)
  const ociIdentifier = ociPackage?.identifier

  if (ociIdentifier) {
    const { reference, version } = parseSkillReference(ociIdentifier)

    return {
      reference,
      version: version ?? ociPackage?.ref ?? skill.version ?? undefined,
    }
  }

  return {
    reference: skill.name ?? 'Unknown skill',
    version: skill.version ?? undefined,
  }
}
