import { Button } from '@/common/components/ui/button'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

type RegistryDetailHeaderProps = {
  title: string
  backTo?: string
  badges?: ReactNode
  description?: string | null
}

export function RegistryDetailHeader({
  title,
  backTo = '/registry',
  badges,
  description,
}: RegistryDetailHeaderProps) {
  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <div className="my-2">
        <LinkViewTransition to={backTo}>
          <Button
            variant="link"
            aria-label="Back"
            className="text-muted-foreground"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
        </LinkViewTransition>
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="m-0 mb-0 p-0 text-3xl font-bold">{title}</h1>
        {badges && <div className="flex items-center gap-3">{badges}</div>}
        {description ? (
          <div className="text-muted-foreground flex-[2] select-none">
            {description}
          </div>
        ) : null}
      </div>
    </div>
  )
}
