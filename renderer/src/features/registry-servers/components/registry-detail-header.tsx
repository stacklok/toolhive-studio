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
    <div className="w-full">
      <div className="mb-5">
        <LinkViewTransition to={backTo}>
          <Button variant="outline" aria-label="Back" className="rounded-full">
            <ChevronLeft className="size-4" />
            Back
          </Button>
        </LinkViewTransition>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-page-title m-0 mb-0 p-0">{title}</h1>
        {badges && <div className="flex items-center gap-2">{badges}</div>}
        {description ? (
          <div className="text-muted-foreground mt-5 flex-2 select-none">
            {description}
          </div>
        ) : null}
      </div>
    </div>
  )
}
