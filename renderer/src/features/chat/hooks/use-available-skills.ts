import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaSkillsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'

/**
 * One installation site for a skill. A skill can be installed in the user home
 * (`scope: 'user'`) and/or in one or more project roots (`scope: 'project'`)
 * with a `projectRoot` path. The same skill `name` may have multiple variants
 * across these locations.
 */
interface SkillVariant {
  scope: 'user' | 'project'
  projectRoot?: string
}

/**
 * A skill dedup-grouped by `metadata.name`. `variants` lists every install
 * site the backend reported. Sorted user-first, then by project root.
 */
interface AvailableSkill {
  name: string
  description: string
  version?: string
  variants: SkillVariant[]
}

/**
 * Long poll: installed skills are static on disk with no runtime status to
 * track, and install / uninstall mutations already invalidate this query.
 */
const SKILLS_REFRESH_MS = 2 * 60 * 1000

/**
 * Pure transformation from the `InstalledSkill[]` wire payload to the
 * dedup-by-name `AvailableSkill[]` the selector renders. Exported so it can be
 * unit-tested without spinning up TanStack Query.
 *
 * Rules:
 * - Skills without a trimmed `metadata.name` are dropped.
 * - The `scope` is coerced to `'user' | 'project'`; anything else is treated
 *   as `'user'`.
 * - A dedup group's canonical `description` / `version` come from the first
 *   record (in backend order) that has them non-empty.
 * - Within a group, variants are sorted user-first, then project variants by
 *   `projectRoot` ascending.
 * - The final list is sorted alphabetically by `name`.
 */
export function groupInstalledSkills(
  rawSkills: readonly InstalledSkill[] | undefined
): AvailableSkill[] {
  const groups = new Map<string, AvailableSkill>()

  for (const skill of rawSkills ?? []) {
    const name = skill.metadata?.name?.trim() ?? ''
    if (!name) continue

    const scope: 'user' | 'project' =
      skill.scope === 'project' ? 'project' : 'user'
    const projectRoot =
      scope === 'project' && typeof skill.project_root === 'string'
        ? skill.project_root.trim()
        : undefined
    const variant: SkillVariant = {
      scope,
      ...(projectRoot ? { projectRoot } : {}),
    }

    const existing = groups.get(name)
    if (existing) {
      existing.variants.push(variant)
      if (!existing.description && skill.metadata?.description) {
        existing.description = skill.metadata.description.trim()
      }
      if (!existing.version && skill.metadata?.version) {
        existing.version = skill.metadata.version
      }
    } else {
      groups.set(name, {
        name,
        description: skill.metadata?.description?.trim() ?? '',
        ...(skill.metadata?.version ? { version: skill.metadata.version } : {}),
        variants: [variant],
      })
    }
  }

  for (const s of groups.values()) {
    s.variants.sort((a, b) => {
      if (a.scope === b.scope) {
        if (!a.projectRoot || !b.projectRoot) return 0
        return a.projectRoot.localeCompare(b.projectRoot)
      }
      return a.scope === 'user' ? -1 : 1
    })
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Fetches installed skills (all scopes), dedups them by name, and joins with
 * the local `enabled_skills` allow-list so the selector can render a single
 * row per name with enabled state and a live count.
 */
export function useAvailableSkills() {
  const { data: skillsPayload, isLoading } = useQuery({
    // Installed skills are static artifacts on disk with no runtime status to
    // track, so a long poll is fine. We refetch on mount to catch anything
    // the user installed from the Skills page, and rely on the install /
    // uninstall mutations there to invalidate this query for faster feedback.
    ...getApiV1BetaSkillsOptions(),
    refetchInterval: SKILLS_REFRESH_MS,
    refetchOnMount: true,
  })

  const { data: enabledNames = [] } = useQuery({
    queryKey: ['enabled-skills'],
    queryFn: async () => await window.electronAPI.chat.getEnabledSkills(),
    refetchInterval: SKILLS_REFRESH_MS,
    refetchOnMount: true,
  })

  const availableSkills = groupInstalledSkills(skillsPayload?.skills)
  const enabledSet = new Set(enabledNames)
  const enabledCount = availableSkills.reduce(
    (acc, s) => (enabledSet.has(s.name) ? acc + 1 : acc),
    0
  )

  return {
    availableSkills,
    enabledNames,
    enabledSet,
    enabledCount,
    isLoading,
  }
}
