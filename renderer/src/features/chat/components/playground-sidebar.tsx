import {
  type ReactElement,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import {
  Archive,
  Bot,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
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
import { formatRelativeTime } from '../lib/format-relative-time'
import { useChatSearch } from '../hooks/use-chat-search'

interface PlaygroundSidebarProps {
  threads: PlaygroundThread[]
  activeThreadId: string | null
  /** Set of thread IDs that currently have an in-flight LLM stream
   * running in the main process. Used to render a live indicator. */
  streamingThreadIds?: ReadonlySet<string>
  onSelectThread: (threadId: string) => void
  onCreateThread: () => void
  onDeleteThread: (threadId: string) => void
  onRenameThread: (threadId: string, title: string) => void
  onToggleStar: (threadId: string) => void
  onArchiveThread: (threadId: string) => void
  /** More Recents exist beyond the loaded pages. */
  hasMoreThreads?: boolean
  isLoadingMore?: boolean
  onLoadMoreThreads?: () => void
}

function ThreadItem({
  thread,
  isActive,
  isStreaming,
  onSelect,
  onDelete,
  onRename,
  onToggleStar,
  onArchive,
}: {
  thread: PlaygroundThread
  isActive: boolean
  isStreaming: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
  onToggleStar: () => void
  onArchive: () => void
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
          className="flex min-w-0 flex-1 items-center gap-1.5 truncate px-2 py-1
            text-left group-hover:pr-8"
          title="Double-click to rename"
        >
          <span className="truncate">{label}</span>
          {isStreaming && (
            <Loader2
              className="text-muted-foreground h-3 w-3 shrink-0 animate-spin"
              aria-label="Streaming"
              data-testid="thread-streaming-indicator"
            />
          )}
        </button>

        {/* Timestamp — sits at the right edge, hidden on hover so the
         * three-dot menu can take its place. Always visible otherwise,
         * even on the currently active thread. */}
        <span
          className="text-muted-foreground shrink-0 pr-2 text-xs
            group-hover:hidden"
        >
          {formatRelativeTime(thread.lastEditTimestamp)}
        </span>

        {/* Three-dot menu — overlays the timestamp on hover only.
         * Absolutely positioned so it doesn't reserve layout space
         * when hidden, keeping the date flush to the right edge. */}
        <div
          className="pointer-events-none absolute top-1/2 right-1
            -translate-y-1/2 opacity-0 group-hover:pointer-events-auto
            group-hover:opacity-100"
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
              {/* Drafts have no DB row yet, so there's nothing to archive. */}
              {!thread.pending && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onArchive()
                  }}
                >
                  <Archive className="mr-2 h-3.5 w-3.5" />
                  Archive
                </DropdownMenuItem>
              )}
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
  streamingThreadIds,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
  onRenameThread,
  onToggleStar,
  onArchiveThread,
  hasMoreThreads = false,
  isLoadingMore = false,
  onLoadMoreThreads,
}: PlaygroundSidebarProps): ReactElement {
  const starredThreads = threads.filter((t) => t.starred)
  const recentThreads = threads.filter((t) => !t.starred)
  const hasStarred = starredThreads.length > 0
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAgentsActive = pathname.startsWith('/playground/agents')
  const isArchivedActive = pathname.startsWith('/playground/archived')
  const { openSearch } = useChatSearch()
  const isMac = window.electronAPI?.isMac ?? false

  const renderItem = (thread: PlaygroundThread) => (
    <ThreadItem
      key={thread.id}
      thread={thread}
      isActive={thread.id === activeThreadId}
      isStreaming={streamingThreadIds?.has(thread.id) ?? false}
      onSelect={() => onSelectThread(thread.id)}
      onDelete={() => onDeleteThread(thread.id)}
      onRename={(title) => onRenameThread(thread.id, title)}
      onToggleStar={() => onToggleStar(thread.id)}
      onArchive={() => onArchiveThread(thread.id)}
    />
  )

  return (
    <aside
      className="border-input text-sidebar-foreground w-sidebar flex h-full
        shrink-0 flex-col border-r"
    >
      <div className="flex flex-col gap-0.5 px-2 pt-2 pb-1">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start gap-2 px-2',
            isAgentsActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground'
          )}
        >
          <Link to="/playground/agents" aria-label="Agents">
            <Bot className="h-4 w-4 shrink-0" />
            Agents
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start gap-2 px-2',
            isArchivedActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground'
          )}
        >
          <Link to="/playground/archived" aria-label="Archived">
            <Archive className="h-4 w-4 shrink-0" />
            Archived
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreateThread}
          aria-label="New chat"
          className="text-muted-foreground w-full justify-start gap-2 px-2"
        >
          <SquarePen className="h-4 w-4 shrink-0" />
          New chat
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openSearch('button')}
          aria-label="Search chats"
          className="text-muted-foreground w-full justify-start gap-2 px-2"
        >
          <Search className="h-4 w-4 shrink-0" />
          Search chats
          <kbd
            className="bg-muted ml-auto rounded px-1.5 font-sans text-[10px]
              font-medium"
          >
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </Button>
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
          {hasMoreThreads && onLoadMoreThreads && (
            <li className="pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMoreThreads}
                disabled={isLoadingMore}
                className="text-muted-foreground w-full justify-start gap-2 px-2
                  text-xs"
              >
                {isLoadingMore && <Loader2 className="h-3 w-3 animate-spin" />}
                Show more
              </Button>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  )
}
