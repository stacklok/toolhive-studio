import { memo, useMemo, useState } from 'react'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { cjk } from '@streamdown/cjk'
import type { ChatStatus } from 'ai'

// Module-scope for stable prop identity. Mermaid omitted: heavy runtime,
// no realistic tool output uses it.
const TOOL_OUTPUT_PLUGINS = { code, cjk } as const

// Above this, skip Streamdown and render as <pre> to avoid freezing the
// renderer (large MCP payloads lock the main thread in markdown parsing).
const RAW_RENDER_THRESHOLD = 50_000

// Hard cap on what we put in the DOM; full payload is still copyable.
const RAW_RENDER_TRUNCATE_AT = 500_000

interface ToolOutputContentProps {
  output: unknown
  status: ChatStatus
}

// Pretty-print if `text` parses as JSON object/array, else null.
function tryFormatAsJson(text: string): string | null {
  const trimmed = text.trimStart()
  const first = trimmed[0]
  if (first !== '{' && first !== '[') return null
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return null
  }
}

function TextItem({
  text,
  isStreaming,
}: {
  text: string
  isStreaming: boolean
}) {
  const formattedJson = useMemo(() => tryFormatAsJson(text), [text])
  const [forceMarkdown, setForceMarkdown] = useState(false)

  if (formattedJson !== null) {
    return <RawBlock text={formattedJson} label="JSON" copyText={text} />
  }

  if (text.length > RAW_RENDER_THRESHOLD && !forceMarkdown) {
    return (
      <RawBlock
        text={text}
        label="Plain text"
        copyText={text}
        action={
          <button
            type="button"
            onClick={() => setForceMarkdown(true)}
            className="text-muted-foreground hover:text-foreground text-xs
              underline underline-offset-2"
          >
            Render as markdown
          </button>
        }
      />
    )
  }

  return (
    <div className="bg-background rounded border p-2 text-sm">
      <Streamdown
        plugins={TOOL_OUTPUT_PLUGINS}
        isAnimating={isStreaming}
        className="prose prose-sm max-w-none"
      >
        {text}
      </Streamdown>
    </div>
  )
}

function RawBlock({
  text,
  label,
  copyText,
  action,
}: {
  text: string
  label: string
  copyText: string
  action?: React.ReactNode
}) {
  const isTruncated = text.length > RAW_RENDER_TRUNCATE_AT
  const displayed = isTruncated
    ? `${text.slice(0, RAW_RENDER_TRUNCATE_AT)}\n\n… (truncated, ${(text.length - RAW_RENDER_TRUNCATE_AT).toLocaleString()} more characters — use Copy to get the full payload)`
    : text

  return (
    <div className="bg-background rounded border p-2">
      <div
        className="text-muted-foreground mb-1 flex flex-wrap items-center
          justify-between gap-2 text-xs"
      >
        <span>
          {label} · {text.length.toLocaleString()} chars
          {isTruncated ? ' (truncated)' : ''}
        </span>
        <div className="flex items-center gap-3">
          {action}
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(copyText)
            }}
            className="text-muted-foreground hover:text-foreground text-xs
              underline underline-offset-2"
          >
            Copy
          </button>
        </div>
      </div>
      <pre className="max-h-96 overflow-auto text-xs whitespace-pre-wrap">
        {displayed}
      </pre>
    </div>
  )
}

function ToolOutputContentImpl({ output, status }: ToolOutputContentProps) {
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
              <TextItem
                key={`text-${idx}`}
                text={String(item.text || '')}
                isStreaming={status === 'streaming'}
              />
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
