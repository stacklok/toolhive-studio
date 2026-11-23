import type { ReactElement } from 'react'
import { Archive } from 'lucide-react'
import { Button } from '@/common/components/ui/button'

export function ArchivedThreadBanner({
  onUnarchive,
}: {
  onUnarchive?: () => void
}): ReactElement {
  return (
    <div
      role="status"
      className="bg-muted text-muted-foreground mx-4 mb-2 flex items-center
        gap-2 rounded-md px-3 py-2 text-sm"
    >
      <Archive className="h-4 w-4 shrink-0" />
      <span className="flex-1">This chat is archived.</span>
      {onUnarchive && (
        <Button variant="outline" size="sm" onClick={onUnarchive}>
          Unarchive
        </Button>
      )}
    </div>
  )
}
