import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
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

      <div className="mt-4 text-xl">Hello "{name}"!</div>
    </div>
  )
}
