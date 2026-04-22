import type { RegistrySkill } from '@common/api/generated/types.gen'

export function getOciPackageReference(
  skill: RegistrySkill
): string | undefined {
  return skill.packages?.find(
    (pkg) => pkg.registryType === 'oci' && pkg.identifier
  )?.identifier
}

export function getNamespaceNameReference(
  skill: RegistrySkill
): string | undefined {
  if (skill.namespace && skill.name) {
    return `${skill.namespace}/${skill.name}`
  }

  return undefined
}

function hasOciTagOrDigest(identifier: string): boolean {
  const lastSlashIndex = identifier.lastIndexOf('/')
  const lastColonIndex = identifier.lastIndexOf(':')
  return identifier.includes('@') || lastColonIndex > lastSlashIndex
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

/**
 * Derives the reference to prefill in the install dialog.
 * Prefers the first OCI package identifier. If that OCI identifier is
 * untagged and the skill exposes a separate version, append `:version`
 * for install compatibility. Falls back to `namespace/name`, then name.
 */
export function getSkillInstallReference(skill: RegistrySkill): string {
  const ociReference = getOciPackageReference(skill)

  if (ociReference) {
    if (skill.version && !hasOciTagOrDigest(ociReference)) {
      return `${ociReference}:${skill.version}`
    }

    return ociReference
  }

  return getNamespaceNameReference(skill) ?? skill.name ?? 'Unknown skill'
}
