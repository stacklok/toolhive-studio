import { useState, type ReactElement, type ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'
import {
  SEARCH_HIGHLIGHT_END,
  SEARCH_HIGHLIGHT_START,
} from '@common/chat/thread-search'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/common/components/ui/command'
import { Badge } from '@/common/components/ui/badge'
import { useDebouncedCallback } from '@/common/hooks/use-debounced-callback'
import { trackEvent } from '@/common/lib/analytics'
import { formatRelativeTime } from '../lib/format-relative-time'
import { useChatSearch } from '../hooks/use-chat-search'

const RECENT_LIMIT = 10
const DEBOUNCE_MS = 150

interface SearchRow {
  id: string
  title?: string
  lastEditTimestamp: number
  archivedAt: number | null
  snippet?: string | null
}

/** Renders FTS snippet markers as <mark>, never as HTML. */
function HighlightedSnippet({ text }: { text: string }): ReactElement {
  const nodes: ReactNode[] = []
  let rest = text
  let key = 0
  while (rest.length > 0) {
    const start = rest.indexOf(SEARCH_HIGHLIGHT_START)
    if (start === -1) {
      nodes.push(rest)
      break
    }
    const end = rest.indexOf(SEARCH_HIGHLIGHT_END, start)
    if (start > 0) nodes.push(rest.slice(0, start))
    const hit = rest.slice(start + 1, end === -1 ? undefined : end)
    nodes.push(
      <mark
        key={key++}
        className="text-foreground rounded-sm bg-yellow-200/70 px-0.5 dark:bg-yellow-500/30"
      >
        {hit}
      </mark>
    )
    if (end === -1) break
    rest = rest.slice(end + 1)
  }
  return <>{nodes}</>
}

export function SearchChatsDialog(): ReactElement {
  const { isOpen, setOpen } = useChatSearch()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const updateQuery = useDebouncedCallback((value: string) => {
    // The dialog stays mounted, so a keystroke debounced just before closing
    // can fire after the reset. Drop it unless it still matches the input.
    if (!isOpen || value !== input) return
    setQuery(value.trim())
  }, DEBOUNCE_MS)

  const isSearching = query.length > 0

  const { data: recent = [] } = useQuery({
    queryKey: ['chat', 'search', 'recent'] as const,
    queryFn: async () =>
      (await window.electronAPI.chat.listThreads({ limit: RECENT_LIMIT }))
        .threads,
    enabled: isOpen && !isSearching,
    staleTime: 0,
  })

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['chat', 'search', 'query', query] as const,
    queryFn: () => window.electronAPI.chat.searchThreads(query),
    enabled: isOpen && isSearching,
    placeholderData: keepPreviousData,
    staleTime: 0,
  })

  const rows: SearchRow[] = isSearching ? results : recent
  // cmdk loses its selection when the item list is swapped out, which would
  // make Enter a no-op after typing. Keep the selection controlled and fall
  // back to the top result.
  const [selectedId, setSelectedId] = useState('')
  // A new result set (new query, or the same ids in a new order) starts
  // again from the top; arrow-key choices only survive a refetch that
  // returns the same list.
  const rowsKey = `${isSearching ? `q:${query}` : 'recent'}|${rows
    .map((r) => r.id)
    .join(',')}`
  const [selectionRowsKey, setSelectionRowsKey] = useState(rowsKey)
  if (selectionRowsKey !== rowsKey) {
    setSelectionRowsKey(rowsKey)
    setSelectedId('')
  }
  const activeId = rows.some((r) => r.id === selectedId)
    ? selectedId
    : (rows[0]?.id ?? '')

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    if (!open) {
      setInput('')
      setQuery('')
    }
  }

  const handleSelect = (row: SearchRow) => {
    trackEvent('Playground: select search result', {
      'search.has_query': isSearching,
      'thread.archived': row.archivedAt !== null,
    })
    handleOpenChange(false)
    void navigate({
      to: '/playground/chat/$threadId',
      params: { threadId: row.id },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Search chats</DialogTitle>
        <DialogDescription>
          Search playground chats by title or message text
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        {/* Results are ranked by the main process — disable cmdk's own
            fuzzy filter so it doesn't hide or reorder them. */}
        <Command
          shouldFilter={false}
          value={activeId}
          onValueChange={setSelectedId}
          className="[&_[cmdk-input]]:h-12"
        >
          <CommandInput
            placeholder="Search chats…"
            value={input}
            onValueChange={(value) => {
              setInput(value)
              updateQuery(value)
            }}
          />
          <CommandList className="max-h-[420px]">
            {isSearching && !isFetching && rows.length === 0 && (
              <CommandEmpty>No chats found.</CommandEmpty>
            )}
            {!isSearching && rows.length === 0 && (
              <CommandEmpty>No chats yet.</CommandEmpty>
            )}
            {rows.length > 0 && (
              <CommandGroup heading={isSearching ? 'Results' : 'Recent chats'}>
                {rows.map((row) => (
                  <CommandItem
                    key={row.id}
                    value={row.id}
                    onSelect={() => handleSelect(row)}
                    className="items-start gap-3 py-2.5"
                  >
                    <MessageSquare className="mt-0.5" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">
                          {row.title ?? 'New chat'}
                        </span>
                        {row.archivedAt !== null && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 px-1.5 py-0 text-[10px]"
                          >
                            Archived
                          </Badge>
                        )}
                        <span
                          className="text-muted-foreground ml-auto shrink-0
                            text-xs"
                        >
                          {formatRelativeTime(row.lastEditTimestamp)}
                        </span>
                      </div>
                      {row.snippet && (
                        <span
                          className="text-muted-foreground line-clamp-2 text-xs"
                        >
                          <HighlightedSnippet text={row.snippet} />
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
