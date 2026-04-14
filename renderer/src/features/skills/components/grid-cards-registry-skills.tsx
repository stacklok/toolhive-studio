import type { RegistrySkill } from '@common/api/generated/types.gen'
import { CardRegistrySkill } from './card-registry-skill'
import { cn } from '@/common/lib/utils'

export function GridCardsRegistrySkills({
  skills,
}: {
  skills: RegistrySkill[]
}) {
  if (skills.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p className="text-sm">No skills found matching the current filter</p>
      </div>
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
        <CardRegistrySkill
          key={
            skill.namespace && skill.name
              ? `${skill.namespace}/${skill.name}`
              : `skill-${index}`
          }
          skill={skill}
        />
      ))}
    </div>
  )
}
