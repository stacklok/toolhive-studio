import { Button } from '@/common/components/ui/button'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { ChevronLeft } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { useCanGoBack, useRouter } from '@tanstack/react-router'

type RegistryDetailHeaderProps = {
  title: string
  backTo?: string
  backSearch?: Record<string, unknown>
  badges?: ReactNode
  description?: string | null
  /**
   * When true, clicking the back button navigates using browser history
   * (`router.history.back()`) so the previous search params (e.g. pagination)
   * are restored. Falls back to navigating to `backTo` when there is no
   * in-app history to go back to (direct deep-links).
   */
  historyBack?: boolean
}

export function RegistryDetailHeader({
  title,
  backTo = '/registry',
  backSearch,
  badges,
  description,
  historyBack = false,
}: RegistryDetailHeaderProps) {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  const handleBackClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!historyBack || !canGoBack) return
    // Let the browser handle modifier-clicks (open in new tab, etc.)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()
    router.history.back()
  }

  return (
    <div className="w-full">
      <div className="mb-5">
        <LinkViewTransition
          to={backTo}
          search={backSearch}
          onClick={handleBackClick}
        >
          <Button variant="outline" aria-label="Back" className="rounded-full">
            <ChevronLeft className="size-4" />
            Back
          </Button>
        </LinkViewTransition>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-page-title m-0 p-0">{title}</h1>
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
