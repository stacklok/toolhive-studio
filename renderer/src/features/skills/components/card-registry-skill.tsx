import { useState } from 'react'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { cn } from '@/common/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { DialogInstallSkill } from './dialog-install-skill'

export function CardRegistrySkill({ skill }: { skill: RegistrySkill }) {
  const [installOpen, setInstallOpen] = useState(false)
  const navigate = useNavigate()

  const name = skill.name ?? 'Unknown skill'
  const namespace = skill.namespace
  const description = skill.description
  const defaultReference =
    namespace && name !== 'Unknown skill' ? `${namespace}/${name}` : name

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
      <Card
        className={cn(
          'relative flex flex-col',
          'transition-[box-shadow,color]',
          canNavigate && 'cursor-pointer hover:ring',
          'has-[button:focus-visible]:ring',
          'focus-visible:ring focus-visible:outline-none'
        )}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleCardClick()
          }
        }}
        role={canNavigate ? 'link' : undefined}
        tabIndex={canNavigate ? 0 : undefined}
      >
        <CardHeader>
          <CardTitle className="flex items-start justify-between gap-2 text-xl">
            <Tooltip onlyWhenTruncated>
              <TooltipTrigger asChild>
                <span className="truncate select-none">{name}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{name}</TooltipContent>
            </Tooltip>
          </CardTitle>
          {namespace && (
            <p className="text-muted-foreground truncate text-sm select-none">
              {namespace}
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-1">
          {description && (
            <Tooltip onlyWhenTruncated>
              <TooltipTrigger asChild>
                <p
                  className="text-muted-foreground line-clamp-3 text-sm
                    select-none"
                >
                  {description}
                </p>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {description}
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>

        <CardFooter className="mt-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setInstallOpen(true)
            }}
          >
            Install
          </Button>
        </CardFooter>
      </Card>

      <DialogInstallSkill
        open={installOpen}
        onOpenChange={setInstallOpen}
        defaultReference={defaultReference}
      />
    </>
  )
}
