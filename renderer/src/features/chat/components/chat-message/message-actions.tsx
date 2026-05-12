import { Copy } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/common/lib/utils'
import { useCopyToClipboard } from '@/common/hooks/use-copy-to-clipboard'

interface MessageActionsProps {
  copyText: string
  // Reserved for a future PR (edit/resend). Intentionally NOT rendered yet —
  // PR 1 is strictly the Copy affordance.
  onEdit?: () => void
  className?: string
}

/**
 * Hover-revealed action slot for a chat message row. Sits at the bottom of
 * the row and currently exposes a Copy button only. The parent row must use
 * a `group` className so the opacity transition reveals on hover.
 */
export function MessageActions({ copyText, className }: MessageActionsProps) {
  const { copy } = useCopyToClipboard()

  return (
    <div
      className={cn(
        'flex items-center gap-1 opacity-0 transition-opacity',
        'group-hover:opacity-100 focus-within:opacity-100',
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Copy message"
        onClick={() => {
          void copy(copyText)
        }}
        className="text-muted-foreground hover:text-foreground size-7"
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  )
}
