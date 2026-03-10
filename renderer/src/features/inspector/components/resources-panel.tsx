import { useState } from 'react'
import { Button } from '@/common/components/ui/button'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/common/components/ui/tabs'
import { cn } from '@/common/lib/utils'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import type { McpResource, McpResourceReadResult } from '../types'

interface ResourcesPanelProps {
  resources: McpResource[]
  onReadResource?: (uri: string) => Promise<McpResourceReadResult>
}

export function ResourcesPanel({
  resources,
  onReadResource,
}: ResourcesPanelProps) {
  const [selectedUri, setSelectedUri] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [readResult, setReadResult] = useState<McpResourceReadResult | null>(
    null
  )
  const [readError, setReadError] = useState<string | null>(null)

  const selected = selectedUri
    ? (resources.find((r) => r.uri === selectedUri) ?? null)
    : null

  const handleRead = async () => {
    if (!selected || !onReadResource) return
    setReading(true)
    setReadResult(null)
    setReadError(null)
    try {
      const result = await onReadResource(selected.uri)
      setReadResult(result)
    } catch (err) {
      setReadError(err instanceof Error ? err.message : String(err))
    } finally {
      setReading(false)
    }
  }

  const handleSelect = (uri: string) => {
    setSelectedUri(uri)
    setReadResult(null)
    setReadError(null)
  }

  if (selected) {
    const textContent = readResult?.contents
      .map((c) => c.text ?? '')
      .filter(Boolean)
      .join('\n\n')

    return (
      <div className="flex h-full flex-col">
        <div
          className="border-border bg-card flex flex-shrink-0 items-center gap-3
            border-b px-5 py-3"
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => {
              setSelectedUri(null)
              setReadResult(null)
              setReadError(null)
            }}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div
              className="text-nav-button-active-bg font-mono text-sm
                font-semibold"
            >
              {selected.uri}
            </div>
            {selected.name && (
              <div className="text-foreground text-xs font-medium">
                {selected.name}
              </div>
            )}
            {selected.mimeType && (
              <div className="text-muted-foreground font-mono text-[10px]">
                {selected.mimeType}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-5">
            {selected.description && (
              <div className="text-muted-foreground text-sm">
                {selected.description}
              </div>
            )}

            <div>
              <Button
                variant="action"
                size="sm"
                onClick={handleRead}
                disabled={reading || !onReadResource}
              >
                {reading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Reading...
                  </>
                ) : (
                  <>
                    <BookOpen className="size-3.5" />
                    Read Resource
                  </>
                )}
              </Button>
              {!onReadResource && (
                <p className="text-muted-foreground mt-2 text-xs">
                  Connect to a server to read resources
                </p>
              )}
            </div>

            {(readResult || readError) && (
              <div>
                <div
                  className="text-muted-foreground mb-2 text-[11px]
                    font-semibold tracking-wider uppercase"
                >
                  Content
                </div>
                <div className="border-border overflow-hidden rounded-md border">
                  <div
                    className="border-border bg-card flex items-center
                      justify-between border-b px-3 py-2"
                  >
                    {readError ? (
                      <div
                        className="text-destructive flex items-center gap-1.5
                          text-xs font-medium"
                      >
                        <XCircle className="size-3.5" />
                        {readError}
                      </div>
                    ) : (
                      <div
                        className="text-success flex items-center gap-1.5
                          text-xs font-medium"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Success
                      </div>
                    )}
                    {readResult?.latencyMs != null && (
                      <span className="text-muted-foreground text-[11px]">
                        {readResult.latencyMs}ms
                      </span>
                    )}
                  </div>
                  {readResult && (
                    <Tabs defaultValue="text">
                      <TabsList
                        className="border-border bg-card h-8 w-full
                          justify-start gap-0 rounded-none border-b p-0"
                      >
                        {['text', 'raw'].map((tab) => (
                          <TabsTrigger
                            key={tab}
                            value={tab}
                            className="data-[state=active]:border-nav-button-active-bg
                              data-[state=active]:text-nav-button-active-bg
                              h-full rounded-none border-b-2 border-transparent
                              px-4 text-xs data-[state=active]:bg-transparent
                              data-[state=active]:shadow-none"
                          >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      <TabsContent value="text">
                        <div
                          className="bg-background max-h-[500px] overflow-y-auto
                            p-3"
                        >
                          <pre
                            className={cn(
                              `text-muted-foreground font-mono text-xs
                              whitespace-pre-wrap`,
                              !textContent && 'italic'
                            )}
                          >
                            {textContent || '(no text content)'}
                          </pre>
                        </div>
                      </TabsContent>
                      <TabsContent value="raw">
                        <div
                          className="bg-background max-h-[500px] overflow-y-auto
                            p-3"
                        >
                          <pre
                            className="text-muted-foreground font-mono text-xs
                              break-all whitespace-pre-wrap"
                          >
                            {JSON.stringify(readResult.contents, null, 2)}
                          </pre>
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="border-border bg-card flex flex-shrink-0 items-center
          justify-between border-b px-5 py-3"
      >
        <h2 className="text-base font-semibold">
          Resources{' '}
          <span className="text-muted-foreground text-sm font-normal">
            ({resources.length})
          </span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {resources.length === 0 ? (
          <div
            className="text-muted-foreground flex h-full flex-col items-center
              justify-center gap-2"
          >
            <span className="text-sm">No resources available</span>
            <span className="text-xs">
              Connect to an MCP server to see its resources
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {resources.map((r) => (
              <div
                key={r.uri}
                onClick={() => handleSelect(r.uri)}
                className="border-border bg-card
                  hover:border-nav-button-active-bg cursor-pointer rounded-md
                  border px-3.5 py-2.5 transition-colors"
              >
                <div className="text-nav-button-active-bg font-mono text-xs">
                  {r.uri}
                </div>
                {r.name && (
                  <div className="text-foreground mt-0.5 text-xs font-medium">
                    {r.name}
                  </div>
                )}
                {r.mimeType && (
                  <div
                    className="text-muted-foreground mt-0.5 font-mono
                      text-[10px]"
                  >
                    {r.mimeType}
                  </div>
                )}
                {r.description && (
                  <div className="text-muted-foreground mt-1 text-xs">
                    {r.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
