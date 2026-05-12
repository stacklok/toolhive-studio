import { Copy, Pencil } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/common/lib/utils'
import { useCopyToClipboard } from '@/common/hooks/use-copy-to-clipboard'

interface MessageActionsProps {
  copyText: string
  /**
   * When provided, an Edit button is rendered alongside Copy. Used today for
   * user messages: clicking pre-fills the composer with the message text and
   * focuses the textarea so the user can tweak and resend. Assistant messages
   * omit this prop.
   */
  onEdit?: () => void
  className?: string
}

/**
 * Hover-revealed action slot for a chat message row. Sits at the bottom of
 * the row and exposes Copy (always) plus an optional Edit button. The parent
 * row must use a `group` className so the opacity transition reveals on
 * hover.
 */
export function MessageActions({
  copyText,
  onEdit,
  className,
}: MessageActionsProps) {
  const { copy } = useCopyToClipboard()

  return (
    <div
      className={cn(
        `pointer-events-none flex items-center gap-1 opacity-0
        transition-opacity`,
        'group-hover:pointer-events-auto group-hover:opacity-100',
        'focus-within:pointer-events-auto focus-within:opacity-100',
        className
      )}
    >
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edit message"
          onClick={onEdit}
          className="text-muted-foreground hover:text-foreground size-7"
        >
          <Pencil className="size-3.5" />
        </Button>
      )}
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
