import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'

export function getBuildTitle(build: LocalBuild): string {
  return build.name?.trim() || build.tag?.trim() || 'Unnamed build'
}
