import { Copy } from 'lucide-react'
import { Input } from '@/common/components/ui/input'
import { Button } from '@/common/components/ui/button'
import { toast } from 'sonner'

interface ServerUrlProps {
  url: string
}

export function ServerUrl({ url }: ServerUrlProps) {
  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(url)
    toast('MCP server URL has been copied to clipboard')
  }

  return (
    <div className="flex items-center gap-2 p-2">
      <Input value={url} readOnly className="font-mono text-sm" />
      <Button
        variant="outline"
        size="icon"
        onClick={handleCopyUrl}
        aria-label="Copy URL"
      >
        <Copy className="size-4" />
      </Button>
    </div>
  )
}
