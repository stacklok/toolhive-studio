import {
  type ReactElement,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import {
  Bot,
  MoreHorizontal,
  Pencil,
  SquarePen,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
import { cn } from '@/common/lib/utils'
import { useConfirm } from '@/common/hooks/use-confirm'
import type { PlaygroundThread } from '../hooks/use-playground-threads'

interface PlaygroundSidebarProps {
  threads: PlaygroundThread[]
  activeThreadId: string | null
  onSelectThread: (threadId: string) => void
  onCreateThread: () => void
  onDeleteThread: (threadId: string) => void
  onRenameThread: (threadId: string, title: string) => void
  onToggleStar: (threadId: string) => void
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function ThreadItem({
  thread,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onToggleStar,
}: {
  thread: PlaygroundThread
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
  onToggleStar: () => void
}): ReactElement {
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()

  const label = thread.title ?? 'New chat'

  const startRenaming = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()
      setDraftTitle(thread.title ?? '')
      setIsRenaming(true)
    },
    [thread.title]
  )

  const commitRename = useCallback(() => {
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== thread.title) {
      onRename(trimmed)
    }
    setIsRenaming(false)
  }, [draftTitle, thread.title, onRename])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitRename()
      } else if (e.key === 'Escape') {
        setIsRenaming(false)
      }
    },
    [commitRename]
  )

  // Focus the input when rename mode starts
  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isRenaming])

  if (isRenaming) {
    return (
      <li>
        <div
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1',
            'bg-accent text-accent-foreground'
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            className="bg-background text-foreground min-w-0 flex-1 rounded
              border px-1.5 py-0.5 text-sm outline-none focus:ring-1"
            aria-label="Rename thread"
          />
        </div>
      </li>
    )
  }

  return (
    <li>
      <div
        className={cn(
          'group relative flex w-full items-center gap-1 rounded-md text-sm',
          'transition-colors',
          isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={(e) => startRenaming(e)}
          className="min-w-0 flex-1 truncate px-2 py-1 text-left"
          title="Double-click to rename"
        >
          <span className="truncate">{label}</span>
        </button>

        {/* Timestamp — hidden on hover/active, replaced by menu */}
        <span
          className={cn(
            'text-muted-foreground shrink-0 pr-2 text-xs',
            'group-hover:hidden',
            isActive && 'hidden'
          )}
        >
          {formatRelativeTime(thread.lastEditTimestamp)}
        </span>

        {/* Three-dot menu — visible on hover or when active */}
        <div
          className={cn(
            'pointer-events-none flex shrink-0 pr-1 opacity-0',
            'group-hover:pointer-events-auto group-hover:opacity-100',
            isActive && 'pointer-events-auto opacity-100'
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-6 w-6"
                aria-label="Thread options"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleStar()
                }}
              >
                {thread.starred ? (
                  <>
                    <StarOff className="mr-2 h-3.5 w-3.5" />
                    Unstar
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-3.5 w-3.5" />
                    Star
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  startRenaming()
                }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async (e) => {
                  e.stopPropagation()
                  const ok = await confirm(
                    `Delete "${label}"? This cannot be undone.`,
                    {
                      title: 'Delete thread',
                      isDestructive: true,
                      buttons: { yes: 'Delete', no: 'Cancel' },
                    }
                  )
                  if (ok) onDelete()
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  )
}

function SectionHeader({ label }: { label: string }): ReactElement {
  return (
    <li className="px-2 pt-2 pb-0.5">
      <span
        className="text-muted-foreground text-[11px] font-semibold
          tracking-wider uppercase"
      >
        {label}
      </span>
    </li>
  )
}

export function PlaygroundSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
  onRenameThread,
  onToggleStar,
}: PlaygroundSidebarProps): ReactElement {
  const starredThreads = threads.filter((t) => t.starred)
  const recentThreads = threads.filter((t) => !t.starred)
  const hasStarred = starredThreads.length > 0
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAgentsActive = pathname.startsWith('/playground/agents')

  const renderItem = (thread: PlaygroundThread) => (
    <ThreadItem
      key={thread.id}
      thread={thread}
      isActive={thread.id === activeThreadId}
      onSelect={() => onSelectThread(thread.id)}
      onDelete={() => onDeleteThread(thread.id)}
      onRename={(title) => onRenameThread(thread.id, title)}
      onToggleStar={() => onToggleStar(thread.id)}
    />
  )

  return (
    <aside
      className="border-input text-sidebar-foreground w-sidebar flex h-full
        shrink-0 flex-col border-r"
    >
      <div className="flex flex-col gap-0.5 px-2 pt-2 pb-1">
        <Link
          to="/playground/agents"
          aria-label="Agents"
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm',
            'transition-colors',
            isAgentsActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          <Bot className="h-4 w-4 shrink-0" />
          Agents
        </Link>
        <button
          type="button"
          onClick={onCreateThread}
          aria-label="New chat"
          className="text-muted-foreground hover:text-foreground
            hover:bg-accent/60 flex w-full items-center gap-2 rounded-md px-2
            py-1 text-left text-sm transition-colors"
        >
          <SquarePen className="h-4 w-4 shrink-0" />
          New chat
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        <ul className="flex flex-col gap-0.5">
          {hasStarred && (
            <>
              <SectionHeader label="Starred" />
              {starredThreads.map(renderItem)}
              <SectionHeader label="Recents" />
            </>
          )}
          {recentThreads.map(renderItem)}
        </ul>
      </nav>
    </aside>
  )
}
