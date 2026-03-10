import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Plus, X } from 'lucide-react'

interface HeaderEntry {
  key: string
  value: string
}

interface HeadersProps {
  headers: HeaderEntry[]
  onHeaderChange: (idx: number, field: 'key' | 'value', val: string) => void
  onHeaderRemove: (idx: number) => void
  onAddHeader: () => void
}

export function HeadersPanel({
  headers,
  onHeaderChange,
  onHeaderRemove,
  onAddHeader,
}: HeadersProps) {
  return (
    <div className="flex h-full flex-col">
      <div
        className="border-border bg-card flex flex-shrink-0 items-center
          justify-between border-b px-5 py-3"
      >
        <h2 className="text-base font-semibold">Headers Configuration</h2>
        <Button variant="action" size="sm" onClick={onAddHeader}>
          <Plus className="size-3.5" />
          Add Header
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div
          className="text-muted-foreground mb-1 text-[11px] font-semibold
            tracking-wider uppercase"
        >
          Custom Headers
        </div>
        {headers.length === 0 ? (
          <div
            className="border-border text-muted-foreground mb-6 rounded-md
              border border-dashed px-4 py-6 text-center text-xs"
          >
            No custom headers. Click "Add Header" to add one.
          </div>
        ) : (
          <div className="mb-6 flex flex-col gap-1.5">
            {headers.map((h, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={h.key}
                  onChange={(e) => onHeaderChange(i, 'key', e.target.value)}
                  className="w-2/5 font-mono text-xs"
                  placeholder="Header name"
                />
                <Input
                  value={h.value}
                  onChange={(e) => onHeaderChange(i, 'value', e.target.value)}
                  className="flex-1 font-mono text-xs"
                  placeholder="Value"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive
                    size-9"
                  onClick={() => onHeaderRemove(i)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="text-muted-foreground text-[11px]">
          These headers will be sent with every MCP request to the connected
          server. The <span className="font-mono">Mcp-Session-Id</span> header
          is managed automatically.
        </div>
      </div>
    </div>
  )
}
