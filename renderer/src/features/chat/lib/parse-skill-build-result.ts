import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'

export interface SkillBuildResult {
  reference: string
  build: LocalBuild
}

/**
 * Narrow an unknown tool `output` into a `SkillBuildResult` if it looks like a
 * successful `build_skill` response. Returns `null` otherwise so the caller can
 * fall back to the generic tool result rendering.
 */
export function parseSkillBuildResult(
  output: unknown
): SkillBuildResult | null {
  if (!output || typeof output !== 'object') return null
  const obj = output as Record<string, unknown>
  const reference = obj.reference
  if (typeof reference !== 'string' || reference.length === 0) return null

  const rawBuild =
    obj.build && typeof obj.build === 'object'
      ? (obj.build as Record<string, unknown>)
      : null

  const topLevelTag =
    typeof obj.tag === 'string' && obj.tag.length > 0 ? obj.tag : null

  const pickString = (v: unknown) =>
    typeof v === 'string' && v.length > 0 ? v : undefined

  const build: LocalBuild = {
    name: pickString(rawBuild?.name),
    description: pickString(rawBuild?.description),
    tag: pickString(rawBuild?.tag) ?? topLevelTag ?? reference,
    version: pickString(rawBuild?.version),
    digest: pickString(rawBuild?.digest),
  }

  return { reference, build }
}
