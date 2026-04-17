import type { RegistrySkill } from '@common/api/generated/types.gen'

/**
 * Derives the ref to use for fetching SKILL.md content via the content API.
 * Prefers the identifier of the first OCI package. Falls back to
 * `namespace/name` (e.g. "io.github.stacklok/skill-creator") since the
 * content endpoint accepts that format directly. Git package URLs are the
 * catalog repo, not a per-skill ref, so they are intentionally ignored.
 */
export function getSkillOciRef(skill: RegistrySkill): string | undefined {
  const oci = skill.packages?.find(
    (p) => p.registryType === 'oci' && p.identifier
  )
  if (oci) return oci.identifier
  if (skill.namespace && skill.name) return `${skill.namespace}/${skill.name}`
  return undefined
}
