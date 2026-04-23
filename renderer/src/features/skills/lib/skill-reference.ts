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

function hasOciTagOrDigest(identifier: string): boolean {
  const lastSlashIndex = identifier.lastIndexOf('/')
  const lastColonIndex = identifier.lastIndexOf(':')
  return identifier.includes('@') || lastColonIndex > lastSlashIndex
}

function appendOciRef(identifier: string, ref: string): string {
  return ref.includes(':') ? `${identifier}@${ref}` : `${identifier}:${ref}`
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
 * untagged and the package exposes a separate `ref`, append it as a tag or
 * digest. Otherwise, keep the bare OCI identifier. Falls back to
 * `namespace/name`, then name.
 */
export function getSkillInstallReference(skill: RegistrySkill): string {
  const ociPackage = getOciPackage(skill)
  const ociReference = ociPackage?.identifier

  if (ociReference) {
    if (!hasOciTagOrDigest(ociReference)) {
      if (ociPackage?.ref) {
        return appendOciRef(ociReference, ociPackage.ref)
      }
    }

    return ociReference
  }

  return getNamespaceNameReference(skill) ?? skill.name ?? 'Unknown skill'
}
