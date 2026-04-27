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

interface OciIdentifierParts {
  identifier: string
  version?: string
}

/**
 * Splits an OCI identifier into the bare identifier and an optional
 * version (tag or digest). Returns the original input when no version
 * suffix is present.
 */
function splitOciIdentifier(identifier: string): OciIdentifierParts {
  const digestIndex = identifier.indexOf('@')
  if (digestIndex !== -1) {
    return {
      identifier: identifier.slice(0, digestIndex),
      version: identifier.slice(digestIndex + 1),
    }
  }

  const lastSlashIndex = identifier.lastIndexOf('/')
  const lastColonIndex = identifier.lastIndexOf(':')
  if (lastColonIndex > lastSlashIndex) {
    return {
      identifier: identifier.slice(0, lastColonIndex),
      version: identifier.slice(lastColonIndex + 1),
    }
  }

  return { identifier }
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
   * derived from the OCI tag/digest or the package `ref` field.
   * Undefined when no version information is available.
   */
  version?: string
}

/**
 * Derives the values to prefill in the install dialog. The OCI identifier
 * is split so the version (tag or digest) lives in its own field rather
 * than being baked into the reference. Falls back to `namespace/name`,
 * then `name`, when no OCI package is available.
 */
export function getSkillInstallDefaults(
  skill: RegistrySkill
): SkillInstallDefaults {
  const ociPackage = getOciPackage(skill)
  const ociIdentifier = ociPackage?.identifier

  if (ociIdentifier) {
    const { identifier, version } = splitOciIdentifier(ociIdentifier)

    return {
      reference: identifier,
      version: version ?? ociPackage?.ref ?? undefined,
    }
  }

  return {
    reference:
      getNamespaceNameReference(skill) ?? skill.name ?? 'Unknown skill',
  }
}
