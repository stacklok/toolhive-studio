import { memo } from 'react'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { cjk } from '@streamdown/cjk'
import type { ChatStatus } from 'ai'

interface ToolOutputContentProps {
  output: unknown
  status: ChatStatus
}

function ToolOutputContentImpl({ output, status }: ToolOutputContentProps) {
  // Parse first, render second — JSX in try/catch can't catch render errors.
  let mcpContent: Record<string, unknown>[] | null = null
  try {
    const out = output as Record<string, unknown>
    if (
      out &&
      typeof out === 'object' &&
      'content' in out &&
      Array.isArray(out.content)
    ) {
      mcpContent = out.content as Record<string, unknown>[]
    }
  } catch {
    mcpContent = null
  }

  if (mcpContent) {
    return (
      <div className="space-y-3">
        {mcpContent.map((item, idx) => {
          if (item.type === 'text') {
            return (
              <div
                key={`text-${idx}`}
                className="bg-background rounded border p-2 text-sm"
              >
                <Streamdown
                  plugins={{ code, mermaid, cjk }}
                  isAnimating={status === 'streaming'}
                  className="prose prose-sm max-w-none"
                >
                  {String(item.text || '')}
                </Streamdown>
              </div>
            )
          }
          if (item.type === 'image') {
            return (
              <div
                key={`image-${idx}`}
                className="bg-background rounded border p-2"
              >
                <div className="text-muted-foreground mb-2 text-xs">
                  Generated Image:
                </div>
                <img
                  src={
                    'url' in item && item.url
                      ? String(item.url)
                      : `data:${String(item.mimeType || 'image/png')};base64,${String(item.data || '')}`
                  }
                  alt={String(item.alt || 'Tool generated image')}
                  className="h-auto max-w-full rounded border"
                />
              </div>
            )
          }
          return (
            <div
              key={`other-${idx}`}
              className="bg-background rounded border p-2 text-xs"
            >
              <div className="text-muted-foreground mb-1">
                Type: {String(item.type)}
              </div>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <pre
      className="bg-background max-h-60 overflow-x-auto rounded border p-2
        text-xs"
    >
      {JSON.stringify(output, null, 2)}
    </pre>
  )
}

export const ToolOutputContent = memo(ToolOutputContentImpl)
