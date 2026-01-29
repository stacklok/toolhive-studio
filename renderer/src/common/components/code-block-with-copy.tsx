import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/common/components/ui/button'

interface CodeBlockWithCopyProps {
  code: string
}

const TIMEOUT_MS = 2000

export function CodeBlockWithCopy({ code }: CodeBlockWithCopyProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), TIMEOUT_MS)
    } catch {
      // Ignore copy errors
    }
  }

  return (
    <div className="bg-muted relative rounded-md">
      <pre className="p-4 pr-12 text-sm">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 size-8"
        title={copied ? 'Copied!' : 'Copy command'}
      >
        {copied ? (
          <Check className="size-4 text-green-600" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </div>
  )
}
