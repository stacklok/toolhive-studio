import {
  type ReactElement,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import { Pencil, Star, StarOff, Trash2 } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/common/lib/utils'
import { useConfirm } from '@/common/hooks/use-confirm'

interface ThreadTitleBarProps {
  title?: string
  starred?: boolean
  onRename?: (title: string) => void
  onToggleStar?: () => void
  onDelete?: () => void
}

export function ThreadTitleBar({
  title,
  starred,
  onRename,
  onToggleStar,
  onDelete,
}: ThreadTitleBarProps): ReactElement {
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()

  const displayTitle = title ?? 'New chat'

  const startRenaming = useCallback(() => {
    setDraftTitle(title ?? '')
    setIsRenaming(true)
  }, [title])

  const commitRename = useCallback(() => {
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== title && onRename) {
      onRename(trimmed)
    }
    setIsRenaming(false)
  }, [draftTitle, title, onRename])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commitRename()
      else if (e.key === 'Escape') setIsRenaming(false)
    },
    [commitRename]
  )

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isRenaming])

  return (
    <div className="flex items-center gap-1 px-4 pt-4 pb-3">
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          className="text-foreground bg-background min-w-0 flex-1 rounded border
            px-2 py-0.5 text-base font-medium outline-none focus:ring-1"
          aria-label="Rename thread"
        />
      ) : (
        <span
          className={cn(
            'text-foreground min-w-0 flex-1 truncate text-base font-medium',
            onRename && 'cursor-text'
          )}
          title={displayTitle}
          onClick={onRename ? startRenaming : undefined}
        >
          {displayTitle}
        </span>
      )}

      {/* Inline action: edit */}
      {!isRenaming && onRename && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-7 w-7
            shrink-0"
          onClick={startRenaming}
          aria-label="Rename thread"
          title="Rename"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Inline action: star */}
      {onToggleStar && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 shrink-0',
            starred
              ? 'text-foreground hover:text-muted-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={onToggleStar}
          aria-label={starred ? 'Unstar thread' : 'Star thread'}
          title={starred ? 'Unstar' : 'Star'}
        >
          {starred ? (
            <Star className="h-3.5 w-3.5 fill-current" />
          ) : (
            <StarOff className="h-3.5 w-3.5" />
          )}
        </Button>
      )}

      {/* Action: delete */}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive h-7 w-7
            shrink-0"
          onClick={async () => {
            const ok = await confirm(
              `Delete "${displayTitle}"? This cannot be undone.`,
              {
                title: 'Delete thread',
                isDestructive: true,
                buttons: { yes: 'Delete', no: 'Cancel' },
              }
            )
            if (ok) onDelete()
          }}
          aria-label="Delete thread"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
