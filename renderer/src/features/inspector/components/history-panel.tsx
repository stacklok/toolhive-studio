import { Button } from '@/common/components/ui/button'
import { Trash2, RotateCcw } from 'lucide-react'
import type { HistoryEntry } from '../types'

interface HistoryPanelProps {
  entries: HistoryEntry[]
  onClear: () => void
  onReplay: (entry: HistoryEntry) => void
}

export function HistoryPanel({
  entries,
  onClear,
  onReplay,
}: HistoryPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div
        className="border-border bg-card flex flex-shrink-0 items-center
          justify-between border-b px-5 py-3"
      >
        <h2 className="text-base font-semibold">
          History{' '}
          <span className="text-muted-foreground text-sm font-normal">
            ({entries.length})
          </span>
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={entries.length === 0}
        >
          <Trash2 className="size-3.5" />
          Clear
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <div
            className="text-muted-foreground flex h-full flex-col items-center
              justify-center gap-2"
          >
            <span className="text-sm">No history yet</span>
            <span className="text-xs">
              Connect to a server and call some tools
            </span>
          </div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr
                className="border-border text-muted-foreground border-b
                  text-left"
              >
                <th className="px-2 py-1.5 font-medium">Time</th>
                <th className="px-2 py-1.5 font-medium">Method / Tool</th>
                <th className="px-2 py-1.5 font-medium">Server</th>
                <th className="px-2 py-1.5 font-medium">Latency</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
                <th className="px-2 py-1.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="border-border border-b">
                  <td
                    className="text-muted-foreground px-2 py-2 font-mono
                      text-[11px]"
                  >
                    {e.time}
                  </td>
                  <td className="px-2 py-2">
                    <code className="bg-muted rounded px-1.5 py-0.5 text-[11px]">
                      {e.method}
                    </code>{' '}
                    <span className="text-muted-foreground">{e.detail}</span>
                  </td>
                  <td className="text-muted-foreground px-2 py-2">
                    {e.server}
                  </td>
                  <td
                    className={`px-2 py-2 font-mono text-[11px]
                      ${e.isError ? 'text-destructive' : 'text-nav-button-active-bg'}`}
                  >
                    {e.latencyMs != null ? `${e.latencyMs}ms` : '—'}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={
                        e.isError ? 'text-destructive' : 'text-success'
                      }
                    >
                      {e.isError ? 'error' : 'ok'}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    {e.method === 'tools/call' && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onReplay(e)}
                      >
                        <RotateCcw className="size-3" />
                        Replay
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
