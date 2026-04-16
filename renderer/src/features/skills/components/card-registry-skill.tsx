import { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import { useNavigate } from '@tanstack/react-router'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { DialogInstallSkill } from './dialog-install-skill'
import { CardSkillBase } from './card-skill-base'

export function CardRegistrySkill({ skill }: { skill: RegistrySkill }) {
  const [installOpen, setInstallOpen] = useState(false)
  const navigate = useNavigate()

  const name = skill.name ?? 'Unknown skill'
  const namespace = skill.namespace
  const description = skill.description
  const isOci = skill.packages?.some((p) => p.registryType === 'oci')
  const base =
    namespace && name !== 'Unknown skill' ? `${namespace}/${name}` : name
  const defaultReference =
    isOci && skill.version ? `${base}:${skill.version}` : base

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
