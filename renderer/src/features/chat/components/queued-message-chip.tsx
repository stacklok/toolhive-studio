import { X } from 'lucide-react'
import type { FileUIPart } from 'ai'
import { Button } from '@/common/components/ui/button'

interface QueuedMessageChipProps {
  queuedMessage: { text: string; files?: FileUIPart[] }
  onCancel: () => void
}

const PREVIEW_MAX = 60

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}…`
}

function formatPreview(message: {
  text: string
  files?: FileUIPart[]
}): string {
  const base = truncate(message.text.trim(), PREVIEW_MAX)
  const fileCount = message.files?.length ?? 0
  if (fileCount === 0) return base
  const fileSuffix = `${fileCount} ${fileCount === 1 ? 'file' : 'files'}`
  return base ? `${base} · ${fileSuffix}` : fileSuffix
}

/**
 * Surfaces a message the user submitted while a stream was still active.
 * The hook holds it in a single-slot per-thread queue and auto-fires it
 * when the current stream completes. The chip lets the user cancel before
 * that happens.
 *
 * Styled to match the rewind chip from {@link ChatInputPrompt} so they
 * read as siblings — but the two chips are mutually exclusive: when the
 * rewind chip is showing, the queue chip is hidden.
 */
export function QueuedMessageChip({
  queuedMessage,
  onCancel,
}: QueuedMessageChipProps) {
  const preview = formatPreview(queuedMessage)
  return (
    <div
      data-testid="queued-message-chip"
      className="bg-card text-muted-foreground flex items-center justify-between
        gap-2 rounded-md border px-3 py-1.5 text-xs"
    >
      <span className="truncate">
        Queued: <span className="text-foreground">{preview}</span> — sends when
        the current response finishes
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Cancel queued message"
        onClick={onCancel}
        className="text-muted-foreground hover:text-foreground -mr-2 h-6 gap-1
          px-2 text-xs"
      >
        <X className="size-3" />
        cancel
      </Button>
    </div>
  )
}
