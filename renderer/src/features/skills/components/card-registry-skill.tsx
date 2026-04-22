import { useState } from 'react'
import { Github } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { useNavigate } from '@tanstack/react-router'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { DialogInstallSkill } from './dialog-install-skill'
import { CardSkillBase } from './card-skill-base'
import { getSkillInstallReference } from '../lib/skill-reference'

export function CardRegistrySkill({ skill }: { skill: RegistrySkill }) {
  const [installOpen, setInstallOpen] = useState(false)
  const navigate = useNavigate()

  const name = skill.name ?? 'Unknown skill'
  const namespace = skill.namespace
  const description = skill.description
  const defaultReference = getSkillInstallReference(skill)

  const canNavigate = !!(namespace && skill.name)

  function handleCardClick() {
    if (!canNavigate) return
    void navigate({
      to: '/skills/$namespace/$skillName',
      params: { namespace: namespace!, skillName: skill.name! },
    })
  }

  return (
    <>
      <CardSkillBase
        title={name}
        subtitle={namespace}
        description={description}
        onClick={canNavigate ? handleCardClick : undefined}
        footer={
          <>
            {skill.repository?.url ? (
              <Button
                variant="ghost"
                asChild
                onClick={(e) => e.stopPropagation()}
                className="relative z-10"
              >
                <a
                  href={skill.repository.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open repository on GitHub"
                >
                  <Github className="text-muted-foreground size-4" />
                </a>
              </Button>
            ) : null}
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={(e) => {
                e.stopPropagation()
                setInstallOpen(true)
              }}
            >
              Install
            </Button>
          </>
        }
      />

      <DialogInstallSkill
        open={installOpen}
        onOpenChange={setInstallOpen}
        defaultReference={defaultReference}
      />
    </>
  )
}
