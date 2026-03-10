import { useState, useRef } from 'react'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/common/components/ui/tabs'
import { cn } from '@/common/lib/utils'
import { ArrowLeft, Play, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { McpTool, McpToolCallResult } from '../types'

interface ToolsPanelProps {
  tools: McpTool[]
  selectedTool: string | null
  onSelectTool: (name: string | null) => void
  replayArgs?: unknown
  showResult: boolean
  onShowResult: (show: boolean) => void
  onCallTool?: (name: string, args: unknown) => Promise<McpToolCallResult>
}

function AnnotationBadge({
  label,
  variant,
}: {
  label: string
  variant: 'green' | 'red' | 'blue' | 'muted'
}) {
  const styles = {
    green: 'bg-success/10 text-success',
    red: 'bg-destructive/10 text-destructive',
    blue: 'bg-blue-500/10 text-blue-400',
    muted: 'bg-muted text-muted-foreground',
  }
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[11px] font-medium',
        styles[variant]
      )}
    >
      {label}
    </span>
  )
}

function AnnotationBadges({
  annotations,
}: {
  annotations: McpTool['annotations']
}) {
  if (!annotations) return null
  const badges: React.ReactNode[] = []
  if (annotations.readOnlyHint)
    badges.push(
      <AnnotationBadge key="ro" label="readOnlyHint" variant="green" />
    )
  if (annotations.destructiveHint)
    badges.push(
      <AnnotationBadge key="dest" label="destructiveHint" variant="red" />
    )
  if (annotations.idempotentHint)
    badges.push(
      <AnnotationBadge key="idem" label="idempotentHint" variant="blue" />
    )
  if (annotations.openWorldHint)
    badges.push(
      <AnnotationBadge key="ow" label="openWorldHint" variant="muted" />
    )
  return badges.length > 0 ? (
    <div className="mt-1.5 flex flex-wrap gap-1">{badges}</div>
  ) : null
}

function buildDefaultArgs(
  inputSchema: Record<string, unknown> | undefined
): string {
  if (!inputSchema) return '{}'
  const props = inputSchema.properties as Record<string, unknown> | undefined
  if (!props) return '{}'
  const required = (inputSchema.required as string[]) ?? []
  const obj: Record<string, string> = {}
  for (const key of required) {
    obj[key] = ''
  }
  return JSON.stringify(obj, null, 2)
}

export function ToolsPanel({
  tools,
  selectedTool,
  onSelectTool,
  replayArgs,
  showResult,
  onShowResult,
  onCallTool,
}: ToolsPanelProps) {
  const [filter, setFilter] = useState('')
  const [inputJson, setInputJson] = useState('{}')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [calling, setCalling] = useState(false)
  const [callResult, setCallResult] = useState<McpToolCallResult | null>(null)
  const [callError, setCallError] = useState<string | null>(null)

  const filteredTools = tools.filter(
    (t) => !filter || t.name.toLowerCase().includes(filter.toLowerCase())
  )

  const toolDetail = selectedTool
    ? (tools.find((t) => t.name === selectedTool) ?? null)
    : null

  const handleSelectTool = (name: string, initialArgs?: unknown) => {
    onSelectTool(name)
    onShowResult(false)
    setCallResult(null)
    setCallError(null)
    setJsonError(null)
    if (initialArgs !== undefined) {
      setInputJson(JSON.stringify(initialArgs, null, 2))
    } else {
      const tool = tools.find((t) => t.name === name)
      setInputJson(buildDefaultArgs(tool?.inputSchema))
    }
  }

  // When replayArgs arrives from parent, update the textarea
  const prevReplayArgs = useRef<unknown>(undefined)
  if (
    replayArgs !== prevReplayArgs.current &&
    replayArgs !== undefined &&
    selectedTool
  ) {
    prevReplayArgs.current = replayArgs
    setInputJson(JSON.stringify(replayArgs, null, 2))
  }

  const handleRunTool = async () => {
    if (!toolDetail || !onCallTool) return
    let args: unknown
    try {
      args = JSON.parse(inputJson)
      setJsonError(null)
    } catch {
      setJsonError('Invalid JSON')
      return
    }
    setCalling(true)
    setCallResult(null)
    setCallError(null)
    try {
      const result = await onCallTool(toolDetail.name, args)
      setCallResult(result)
      onShowResult(true)
    } catch (err) {
      setCallError(err instanceof Error ? err.message : String(err))
      onShowResult(true)
    } finally {
      setCalling(false)
    }
  }

  if (selectedTool && toolDetail) {
    const schemaJson = toolDetail.inputSchema
      ? JSON.stringify(toolDetail.inputSchema, null, 2)
      : '(no input schema)'

    const textContent = callResult?.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('\n')

    const rawContent = callResult ? JSON.stringify(callResult, null, 2) : ''

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
              onSelectTool(null)
              onShowResult(false)
              setCallResult(null)
              setCallError(null)
            }}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="font-mono text-base font-semibold">
              {toolDetail.name}
            </div>
            <div className="text-muted-foreground text-xs">
              {toolDetail.description || 'No description'}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-5">
            {toolDetail.annotations && (
              <div>
                <div
                  className="text-muted-foreground mb-2 text-[11px]
                    font-semibold tracking-wider uppercase"
                >
                  Annotations
                </div>
                <AnnotationBadges annotations={toolDetail.annotations} />
              </div>
            )}

            <div>
              <div
                className="text-muted-foreground mb-2 text-[11px] font-semibold
                  tracking-wider uppercase"
              >
                Input Schema
              </div>
              <div
                className="border-border bg-card overflow-x-auto rounded-md
                  border p-4 font-mono text-xs leading-relaxed"
              >
                <pre className="text-muted-foreground whitespace-pre-wrap">
                  {schemaJson}
                </pre>
              </div>
            </div>

            <div>
              <div
                className="text-muted-foreground mb-2 text-[11px] font-semibold
                  tracking-wider uppercase"
              >
                Call Tool
              </div>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <textarea
                    value={inputJson}
                    onChange={(e) => {
                      setInputJson(e.target.value)
                      setJsonError(null)
                    }}
                    className={cn(
                      `bg-card focus-visible:ring-ring/50 min-h-[100px] w-full
                      resize-y rounded-md border px-3 py-2 font-mono text-xs
                      outline-none focus-visible:ring-2`,
                      jsonError
                        ? 'border-destructive focus-visible:border-destructive'
                        : 'border-border focus-visible:border-ring'
                    )}
                    placeholder='{"param": "value"}'
                    spellCheck={false}
                  />
                  {jsonError && (
                    <div className="text-destructive mt-1 text-xs">
                      {jsonError}
                    </div>
                  )}
                </div>
                <Button
                  variant="action"
                  size="sm"
                  className="self-start"
                  onClick={handleRunTool}
                  disabled={calling || !onCallTool}
                >
                  {calling ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5" />
                      Run Tool
                    </>
                  )}
                </Button>
                {!onCallTool && (
                  <p className="text-muted-foreground text-xs">
                    Connect to a server to run tools
                  </p>
                )}
              </div>
            </div>

            {showResult && (callResult || callError) && (
              <div>
                <div
                  className="text-muted-foreground mb-2 text-[11px]
                    font-semibold tracking-wider uppercase"
                >
                  Result
                </div>
                <div className="border-border overflow-hidden rounded-md border">
                  <div
                    className="border-border bg-card flex items-center
                      justify-between border-b px-3 py-2"
                  >
                    {callError ? (
                      <div
                        className="text-destructive flex items-center gap-1.5
                          text-xs font-medium"
                      >
                        <XCircle className="size-3.5" />
                        Error: {callError}
                      </div>
                    ) : callResult?.isError ? (
                      <div
                        className="text-destructive flex items-center gap-1.5
                          text-xs font-medium"
                      >
                        <XCircle className="size-3.5" />
                        Tool returned an error
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
                    {callResult?.latencyMs != null && (
                      <span className="text-muted-foreground text-[11px]">
                        {callResult.latencyMs}ms
                      </span>
                    )}
                  </div>
                  {callResult && (
                    <Tabs defaultValue="text">
                      <TabsList
                        className="border-border bg-card h-8 w-full
                          justify-start gap-0 rounded-none border-b p-0"
                      >
                        {['text', 'json', 'raw'].map((tab) => (
                          <TabsTrigger
                            key={tab}
                            value={tab}
                            className="data-[state=active]:border-nav-button-active-bg
                              data-[state=active]:text-nav-button-active-bg
                              h-full rounded-none border-b-2 border-transparent
                              px-4 text-xs data-[state=active]:bg-transparent
                              data-[state=active]:shadow-none"
                          >
                            {tab === 'json'
                              ? 'JSON'
                              : tab.charAt(0).toUpperCase() + tab.slice(1)}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      <TabsContent value="text">
                        <div
                          className="bg-background max-h-96 overflow-y-auto p-3"
                        >
                          <pre
                            className="text-muted-foreground font-mono text-xs
                              whitespace-pre-wrap"
                          >
                            {textContent || '(no text content)'}
                          </pre>
                        </div>
                      </TabsContent>
                      <TabsContent value="json">
                        <div
                          className="bg-background max-h-96 overflow-y-auto p-3"
                        >
                          <pre
                            className="text-muted-foreground font-mono text-xs
                              whitespace-pre-wrap"
                          >
                            {JSON.stringify(callResult.content, null, 2)}
                          </pre>
                        </div>
                      </TabsContent>
                      <TabsContent value="raw">
                        <div
                          className="bg-background max-h-96 overflow-y-auto p-3"
                        >
                          <pre
                            className="text-muted-foreground font-mono text-xs
                              break-all whitespace-pre-wrap"
                          >
                            {rawContent}
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
          Tools{' '}
          <span className="text-muted-foreground text-sm font-normal">
            ({filteredTools.length})
          </span>
        </h2>
        <Input
          placeholder="Filter tools..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-7 w-44 text-xs"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tools.length === 0 ? (
          <div
            className="text-muted-foreground flex h-full flex-col items-center
              justify-center gap-2"
          >
            <span className="text-sm">No tools available</span>
            <span className="text-xs">
              Connect to an MCP server to see its tools
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredTools.map((tool, i) => (
              <div
                key={`${tool.name}-${i}`}
                onClick={() => handleSelectTool(tool.name, undefined)}
                className="border-border bg-card
                  hover:border-nav-button-active-bg cursor-pointer rounded-md
                  border px-4 py-3 transition-all"
              >
                <div className="font-mono text-sm font-semibold">
                  {tool.name}
                </div>
                {tool.description ? (
                  <div
                    className="text-muted-foreground mt-1 text-xs leading-snug"
                  >
                    {tool.description}
                  </div>
                ) : (
                  <div className="text-muted-foreground mt-1 text-xs italic">
                    No description provided
                  </div>
                )}
                <AnnotationBadges annotations={tool.annotations} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
