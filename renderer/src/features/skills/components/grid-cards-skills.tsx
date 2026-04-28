import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'
import { CardSkill } from './card-skill'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoSearchResults } from '@/common/components/illustrations/illustration-no-search-results'
import { cn } from '@/common/lib/utils'

export function GridCardsSkills({ skills }: { skills: InstalledSkill[] }) {
  if (skills.length === 0) {
    return (
      <EmptyState
        illustration={IllustrationNoSearchResults}
        title="No skills found"
        body="Try adjusting your search to find what you're looking for."
      />
    )
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        skills.length <= 3
          ? 'grid-cols-[repeat(auto-fill,minmax(max(200px,min(300px,100%)),1fr))]'
          : 'grid-cols-[repeat(auto-fit,minmax(max(200px,min(300px,100%)),1fr))]'
      )}
    >
      {skills.map((skill, index) => (
        <CardSkill
          key={skill.reference ?? skill.metadata?.name ?? `skill-${index}`}
          skill={skill}
        />
      ))}
    </div>
  )
}
