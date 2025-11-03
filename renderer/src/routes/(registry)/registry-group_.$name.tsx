import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import { Badge } from '@/common/components/ui/badge'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { ChevronLeft } from 'lucide-react'

export const Route = createFileRoute('/(registry)/registry-group_/$name')({
  component: RegistryGroupDetail,
})

export function RegistryGroupDetail() {
  const { name } = Route.useParams()
  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <div className="my-2">
        <LinkViewTransition to="/registry">
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
        <h1 className="m-0 mb-0 p-0 text-3xl font-bold">{name}</h1>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="bg-foreground/5 w-fit rounded-full px-2.5 py-0.5"
          >
            Group
          </Badge>
        </div>
      </div>
    </div>
  )
}
