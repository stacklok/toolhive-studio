import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'
import { Unplug, Zap, Loader2, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import type { Transport } from '../types'

interface ConnectionBarProps {
  transport: Transport
  onTransportChange: (t: Transport) => void
  url: string
  onUrlChange: (url: string) => void
  connected: boolean
  connecting?: boolean
  onToggleConnect: () => void
}

export function ConnectionBar({
  transport,
  onTransportChange,
  url,
  onUrlChange,
  connected,
  connecting = false,
  onToggleConnect,
}: ConnectionBarProps) {
  return (
    <div
      className="border-border bg-card flex flex-shrink-0 items-center gap-0
        border-b px-4 py-2"
    >
      <Select
        value={transport}
        onValueChange={(v) => onTransportChange(v as Transport)}
      >
        <SelectTrigger
          className="w-auto rounded-r-none border-r-0 font-mono text-xs
            font-semibold focus-visible:z-10 focus-visible:ring-0"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="streamable-http">Streamable HTTP</SelectItem>
          <SelectItem value="sse">SSE</SelectItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <SelectItem value="stdio" disabled>
                  stdio
                </SelectItem>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="flex items-center gap-1.5">
                <Info className="size-3.5 shrink-0" />
                stdio servers communicate over standard I/O, which doesn&apos;t
                expose an HTTP endpoint for the inspector to connect to
              </p>
            </TooltipContent>
          </Tooltip>
        </SelectContent>
      </Select>
      <Input
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        className="h-9 flex-1 rounded-none border-x-0 font-mono text-sm
          focus-visible:z-10 focus-visible:ring-0"
        placeholder="Enter server URL..."
      />
      <Button
        variant={connected ? 'outline' : 'action'}
        onClick={onToggleConnect}
        disabled={connecting || (!connected && !url)}
        className={`h-9 rounded-l-none rounded-r-md
          ${connected ? 'hover:border-destructive hover:text-destructive' : ''}`}
      >
        {connecting ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Connecting...
          </>
        ) : connected ? (
          <>
            <Unplug className="size-3.5" />
            Disconnect
          </>
        ) : (
          <>
            <Zap className="size-3.5" />
            Connect
          </>
        )}
      </Button>
    </div>
  )
}
