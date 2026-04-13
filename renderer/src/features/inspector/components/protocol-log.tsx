import { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/common/lib/utils'
import type { LogEntry, LogFilter } from '../types'

interface ProtocolLogProps {
  height: number
  onResizeStart: (e: React.MouseEvent) => void
  entries: LogEntry[]
}

type LogTab = 'log' | 'notifications'

const FILTERS: Array<{ id: LogFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'requests', label: 'Requests' },
  { id: 'responses', label: 'Responses' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'errors', label: 'Errors' },
]

function matchesFilter(entry: LogEntry, filter: LogFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'errors') return !!entry.isError
  if (filter === 'requests') return entry.dir === 'out'
  if (filter === 'responses') return entry.dir === 'in' && !entry.isError
  if (filter === 'notifications')
    return entry.dir === 'notif' || entry.method.startsWith('notifications/')
  return true
}

export function ProtocolLog({
  height,
  onResizeStart,
  entries,
}: ProtocolLogProps) {
  const [tab, setTab] = useState<LogTab>('log')
  const [filter, setFilter] = useState<LogFilter>('all')
  const [cleared, setCleared] = useState(false)

  const displayEntries = cleared ? [] : entries
  const filtered = displayEntries.filter((e) => matchesFilter(e, filter))

  return (
    <div
      className="border-border bg-card flex flex-shrink-0 flex-col border-t"
      style={{ height }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="hover:bg-nav-button-active-bg relative z-10 h-[5px]
          flex-shrink-0 cursor-row-resize bg-transparent transition-colors"
      />

      {/* Header */}
      <div
        className="border-border flex flex-shrink-0 items-center justify-between
          border-b px-3"
      >
        <div className="flex">
          {(['log', 'notifications'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'border-b-2 px-3.5 py-1.5 text-sm transition-colors',
                tab === t
                  ? 'border-nav-button-active-bg text-nav-button-active-bg'
                  : `text-muted-foreground hover:text-foreground
                    border-transparent`
              )}
            >
              {t === 'log' ? 'Protocol Log' : 'Notifications'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] transition-all',
                  filter === f.id
                    ? `border-nav-button-active-bg bg-nav-button-active-bg/15
                      text-nav-button-active-bg`
                    : `border-border text-muted-foreground
                      hover:border-muted-foreground`
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="xs" onClick={() => setCleared(true)}>
            Clear
          </Button>
          <Button variant="outline" size="xs">
            Export
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {tab === 'log' ? (
          <div className="flex flex-col gap-0.5">
            {filtered.length === 0 && (
              <div className="text-muted-foreground py-6 text-center text-sm">
                {entries.length === 0
                  ? 'Connect to an MCP server to see the protocol log'
                  : 'No matching entries'}
              </div>
            )}
            {filtered.map((e, i) => (
              <div
                key={i}
                className={cn(
                  `hover:bg-muted/50 flex cursor-pointer items-start gap-2.5
                    rounded px-2 py-1 font-mono text-xs leading-relaxed
                    transition-colors`,
                  e.isError && 'bg-destructive/10',
                  e.isWarning && 'bg-warning/10'
                )}
              >
                <span
                  className="text-muted-foreground min-w-[70px]
                    whitespace-nowrap"
                >
                  {e.time}
                </span>
                <span
                  className={cn(
                    'min-w-[14px] text-center font-bold',
                    e.dir === 'out' && 'text-nav-button-active-bg',
                    e.dir === 'in' && 'text-success',
                    e.dir === 'notif' && 'text-warning'
                  )}
                >
                  {e.dir === 'out' ? '→' : e.dir === 'in' ? '←' : '●'}
                </span>
                <span
                  className={cn(
                    'font-medium',
                    e.isError
                      ? 'text-destructive'
                      : e.isWarning
                        ? 'text-warning'
                        : 'text-foreground'
                  )}
                >
                  {e.method}
                </span>
                {e.id && <span className="text-muted-foreground">{e.id}</span>}
                <span
                  className="text-muted-foreground flex-1 overflow-hidden
                    text-ellipsis whitespace-nowrap"
                >
                  {e.preview}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground py-6 text-center text-sm">
            No notifications
          </div>
        )}
      </div>
    </div>
  )
}
