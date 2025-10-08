import { formatDistanceToNow } from 'date-fns'
import {
  User,
  Bot,
  Wrench,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Brain,
  Zap,
} from 'lucide-react'
import { Streamdown } from 'streamdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { TokenUsage } from './token-usage'
import { NoContentMessage } from './no-content-message'
import { AttachmentPreview } from './attachment-preview'
import { useState } from 'react'
import type { ChatUIMessage } from '../types'
import { getProviderIconByModel } from './provider-icons'

interface ChatMessageProps {
  message: ChatUIMessage
}

// Helper function to render reasoning steps
function ReasoningComponent({ part }: { part: ChatUIMessage['parts'][0] }) {
  const [isOpen, setIsOpen] = useState(false)

  if (part.type !== 'reasoning') return null

  return (
    <div className="bg-card mb-3 rounded-lg border p-3">
      {/* Reasoning Header */}
      <div className="mb-2 flex items-center gap-2">
        <Brain className="h-4 w-4 text-purple-500" />
        <span className="text-foreground text-sm font-medium">
          AI Reasoning
        </span>
      </div>

      {/* Reasoning Content Toggle */}
      <div className="mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-muted-foreground hover:text-foreground flex
            items-center gap-2 text-xs transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>View reasoning steps</span>
        </button>

        {isOpen && (
          <div className="mt-2">
            <div className="bg-background rounded border p-3 text-sm">
              <Streamdown
                className="prose prose-sm max-w-none"
                remarkPlugins={[remarkGfm, remarkMath]}
                allowedImagePrefixes={['data:']}
                defaultOrigin="https://localhost"
              >
                {'text' in part
                  ? part.text || 'No reasoning content'
                  : 'No reasoning content'}
              </Streamdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Note: Steps are not a standard AI SDK part type, so we don't need a separate component

// Helper function to render step start boundaries (AI SDK feature)
function StepStartComponent({
  part,
  index,
}: {
  part: ChatUIMessage['parts'][0]
  index: number
}) {
  if (part.type !== 'step-start') return null

  // Show step boundaries as horizontal lines (skip first step)
  return index > 0 ? (
    <div className="text-muted-foreground my-4">
      <hr className="border-border" />
      <div className="-mt-3 flex items-center justify-center">
        <div className="bg-background text-muted-foreground px-3 text-xs">
          <Zap className="mr-1 inline h-3 w-3" />
          Step Boundary
        </div>
      </div>
    </div>
  ) : null
}

// Helper function to render tool calls with comprehensive information
function ToolCallComponent({ part }: { part: ChatUIMessage['parts'][0] }) {
  const [isInputOpen, setIsInputOpen] = useState(false)
  const [isOutputOpen, setIsOutputOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Handle AI SDK tool call parts (type starts with 'tool-' or is 'dynamic-tool')
  if (!part.type.startsWith('tool-') && part.type !== 'dynamic-tool')
    return null

  // Extract tool name from the type or use toolName property for dynamic tools
  const toolName =
    part.type === 'dynamic-tool'
      ? 'toolName' in part
        ? String(part.toolName)
        : 'Unknown Tool'
      : part.type.replace('tool-', '')

  const toolCallId = 'toolCallId' in part ? part.toolCallId : 'unknown'
  const hasState = 'state' in part
  const state = hasState ? part.state : null

  return (
    <div className="bg-card mb-3 rounded-lg border p-3">
      {/* Tool Header */}
      <div className="mb-2 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-blue-500" />
        <span className="text-foreground text-sm font-medium">
          Tool: {toolName}
        </span>

        {/* State indicators */}
        {state === 'output-available' && (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        {state === 'output-error' && (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
        {state === 'input-streaming' && (
          <div className="flex items-center gap-1">
            <div
              className="h-3 w-3 animate-spin rounded-full border
                border-blue-500 border-t-transparent"
            />
            <span className="text-muted-foreground text-xs">Streaming...</span>
          </div>
        )}

        {/* Tool Call ID Badge */}
        <span
          className="bg-muted text-muted-foreground rounded px-2 py-1 font-mono
            text-xs"
        >
          ID: {toolCallId.slice(-8)}
        </span>
      </div>

      {/* Tool Details Toggle */}
      <div className="mb-2">
        <button
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="text-muted-foreground hover:text-foreground flex
            items-center gap-2 text-xs transition-colors"
        >
          {isDetailsOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>Tool Details</span>
        </button>

        {isDetailsOpen && (
          <div className="text-muted-foreground mt-2 space-y-1 text-xs">
            <div>
              <strong>Tool Name:</strong> {toolName}
            </div>
            <div>
              <strong>Call ID:</strong>{' '}
              <code className="bg-muted rounded px-1">{toolCallId}</code>
            </div>
            <div>
              <strong>Type:</strong> {part.type}
            </div>
            {hasState && (
              <div>
                <strong>State:</strong>{' '}
                <span className="capitalize">{state}</span>
              </div>
            )}
            {'providerExecuted' in part && (
              <div>
                <strong>Provider Executed:</strong>{' '}
                {part.providerExecuted ? 'Yes' : 'No'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Parameters */}
      {'input' in part && part.input !== undefined && (
        <div className="mt-2">
          <button
            onClick={() => setIsInputOpen(!isInputOpen)}
            className="text-muted-foreground hover:text-foreground flex
              items-center gap-2 text-xs transition-colors"
          >
            {isInputOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span>Input Parameters</span>
            {state === 'input-streaming' && (
              <span className="text-blue-500">(Streaming...)</span>
            )}
          </button>
          {isInputOpen && (
            <div className="mt-2">
              <pre
                className="bg-background overflow-x-auto rounded border p-2
                  text-xs"
              >
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Output Results */}
      {'output' in part && part.output !== undefined && (
        <div className="mt-2">
          <button
            onClick={() => setIsOutputOpen(!isOutputOpen)}
            className="text-muted-foreground hover:text-foreground flex
              items-center gap-2 text-xs transition-colors"
          >
            {isOutputOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span>Tool Result</span>
            <CheckCircle className="h-3 w-3 text-green-500" />
          </button>
          {isOutputOpen && (
            <div className="mt-2">
              {(() => {
                // Try to parse and render structured tool output
                try {
                  const output = part.output as Record<string, unknown>

                  // Handle MCP server response format
                  if (
                    output &&
                    typeof output === 'object' &&
                    'content' in output &&
                    Array.isArray(output.content)
                  ) {
                    return (
                      <div className="space-y-3">
                        {output.content.map(
                          (item: Record<string, unknown>, idx: number) => {
                            if (item.type === 'text') {
                              return (
                                <div
                                  key={`text-${idx}`}
                                  className="bg-background rounded border p-2 text-sm"
                                >
                                  <Streamdown
                                    className="prose prose-sm max-w-none"
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    allowedImagePrefixes={['data:']}
                                    defaultOrigin="https://localhost"
                                  >
                                    {String(item.text || '')}
                                  </Streamdown>
                                </div>
                              )
                            } else if (item.type === 'image') {
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
                                    alt={String(
                                      item.alt || 'Tool generated image'
                                    )}
                                    className="h-auto max-w-full rounded border"
                                  />
                                </div>
                              )
                            } else {
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
                            }
                          }
                        )}
                      </div>
                    )
                  }

                  // Fallback to JSON display
                  return (
                    <pre className="bg-background max-h-60 overflow-x-auto rounded border p-2 text-xs">
                      {JSON.stringify(part.output, null, 2)}
                    </pre>
                  )
                } catch {
                  // Fallback to JSON display if parsing fails
                  return (
                    <pre className="bg-background max-h-60 overflow-x-auto rounded border p-2 text-xs">
                      {JSON.stringify(part.output, null, 2)}
                    </pre>
                  )
                }
              })()}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {state === 'output-error' && (
        <div
          className="mt-2 rounded border border-red-200 bg-red-50 p-2
            dark:border-red-800 dark:bg-red-950/20"
        >
          <div
            className="flex items-center gap-2 text-sm text-red-600
              dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4" />
            <strong>Tool Execution Error</strong>
          </div>
          <div className="mt-1 text-xs text-red-700 dark:text-red-300">
            {'errorText' in part ? part.errorText : 'Tool execution failed'}
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="border-border mt-2 border-t pt-2">
        <div
          className="text-muted-foreground flex items-center justify-between
            text-xs"
        >
          <span>
            Status:{' '}
            <span className="font-medium capitalize">{state || 'Unknown'}</span>
          </span>
          {'input' in part &&
            part.input !== undefined &&
            'output' in part &&
            part.output !== undefined && (
              <span className="text-green-600 dark:text-green-400">
                ✓ Completed
              </span>
            )}
          {state === 'input-streaming' && (
            <span className="text-blue-600 dark:text-blue-400">
              ⏳ Processing...
            </span>
          )}
          {state === 'output-error' && (
            <span className="text-red-600 dark:text-red-400">✗ Failed</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  const providerIcon =
    message.metadata?.model && getProviderIconByModel(message.metadata?.model)

  if (isUser) {
    // User message with bubble styling
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[80%] items-start gap-3">
          {/* Message Content */}
          <div className="space-y-2">
            <div
              className="bg-secondary text-secondary-foreground rounded-2xl
                rounded-br-md px-4 py-3 shadow-sm"
            >
              <div className="break-words">
                <Streamdown
                  className="prose prose-sm max-w-none [&_code]:text-sm
                    [&_em]:italic [&_p]:mb-0 [&_p:last-child]:mb-0
                    [&_pre]:text-xs [&_strong]:font-bold"
                  remarkPlugins={[remarkGfm, remarkMath]}
                  allowedImagePrefixes={['data:']}
                  defaultOrigin="https://localhost"
                >
                  {message.parts.find((p) => p.type === 'text' && 'text' in p)
                    ?.text || ''}
                </Streamdown>
              </div>
              {/* Render file attachments */}
              {(() => {
                const fileAttachments = message.parts.filter(
                  (p) => p.type === 'file'
                )
                if (fileAttachments.length === 0) return null

                return (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fileAttachments.map((attachment, index) => (
                      <AttachmentPreview
                        key={index}
                        attachment={attachment}
                        totalAttachments={fileAttachments.length}
                      />
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Timestamp for user messages */}
            <div className="text-muted-foreground text-right text-xs">
              {formatDistanceToNow(
                message.metadata?.createdAt
                  ? new Date(message.metadata.createdAt)
                  : new Date(),
                { addSuffix: true }
              )}
            </div>
          </div>

          {/* User avatar */}
          <div
            className="bg-primary flex h-8 w-8 shrink-0 items-center
              justify-center rounded-lg"
          >
            <User className="text-primary-foreground h-4 w-4" />
          </div>
        </div>
      </div>
    )
  }

  // Assistant message with original styling
  return (
    <div className="flex items-start gap-4">
      {/* Bot avatar */}
      <div
        className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center
          rounded-lg"
      >
        {providerIcon ?? <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div className="min-w-0 flex-1 space-y-2 pr-2">
        {/* Render message content - simplified for streaming */}
        <div className="break-words">
          {/* Render all message parts in order */}
          {message.parts.map((part, index) => {
            switch (part.type) {
              case 'text':
                // Text parts are handled separately below, skip here
                return null

              case 'step-start':
                return (
                  <StepStartComponent
                    key={`step-start-${index}`}
                    part={part}
                    index={index}
                  />
                )

              case 'reasoning':
                return (
                  <ReasoningComponent key={`reasoning-${index}`} part={part} />
                )

              case 'dynamic-tool':
                return (
                  <ToolCallComponent
                    key={`dynamic-tool-${index}`}
                    part={part}
                  />
                )

              case 'file':
                return (
                  <div
                    key={`file-${index}`}
                    className="bg-muted/50 my-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">
                        File: {'name' in part ? String(part.name) : 'Unknown'}
                      </div>
                      {('url' in part || 'data' in part) && (
                        <a
                          href={
                            'url' in part
                              ? String(part.url)
                              : `data:application/octet-stream;base64,${String((part as Record<string, unknown>).data || '')}`
                          }
                          download={'name' in part ? String(part.name) : 'file'}
                          className="text-primary text-sm hover:underline"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                )

              default:
                // Handle image parts (not standard AI SDK type)
                if ((part as Record<string, unknown>).type === 'image') {
                  return (
                    <div key={`image-${index}`} className="my-3">
                      <div className="bg-card rounded-lg border p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-foreground text-sm font-medium">
                            {'alt' in part
                              ? String((part as Record<string, unknown>).alt)
                              : 'Generated Image'}
                          </span>
                        </div>
                        {'data' in part && (
                          <img
                            src={`data:${'mimeType' in part ? String((part as Record<string, unknown>).mimeType) : 'image/png'};base64,${String((part as Record<string, unknown>).data)}`}
                            alt={
                              'alt' in part
                                ? String((part as Record<string, unknown>).alt)
                                : 'Generated image'
                            }
                            className="h-auto max-w-full rounded-lg border"
                          />
                        )}
                      </div>
                    </div>
                  )
                }

                // Handle all tool-* parts
                if (part.type.startsWith('tool-')) {
                  return <ToolCallComponent key={`tool-${index}`} part={part} />
                }
                // Only log truly unknown part types (exclude text, source-*, data-*, image)
                if (
                  !['text', 'source-url', 'source-document', 'image'].includes(
                    part.type
                  ) &&
                  !part.type.startsWith('data-')
                ) {
                  // Unknown part type - silently ignore for now
                }
                return null
            }
          })}

          {/* Render text content after tools */}
          {(() => {
            // Combine all text content from text parts
            interface TextPart {
              type: 'text'
              text: string
            }

            const allTextContent = message.parts
              .filter((p): p is TextPart => p.type === 'text' && 'text' in p)
              .map((p) => p.text || '')
              .join('')

            if (allTextContent.trim()) {
              return (
                <div>
                  <Streamdown
                    className="prose prose-sm text-foreground/80 [&_h1]:text-foreground/85 [&_h2]:text-foreground/80 [&_h3]:text-foreground/75 [&_table]:border-border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:text-foreground/75 [&_td]:border-border [&_a]:text-primary [&_strong]:text-foreground/90 [&_em]:text-foreground/75 [&_blockquote]:border-muted-foreground/30 max-w-none [&_a:hover]:underline [&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:text-xs [&_em]:italic [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1:first-child]:mt-0 [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2:first-child]:mt-0 [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3:first-child]:mt-0 [&_li]:ml-2 [&_li]:text-sm [&_ol]:mb-2 [&_ol]:list-inside [&_ol]:list-decimal [&_ol]:space-y-0.5 [&_p]:mb-2 [&_p]:leading-relaxed [&_p:last-child]:mb-0 [&_pre]:text-xs [&_strong]:font-medium [&_table]:mb-4 [&_table]:min-w-full [&_table]:rounded-md [&_table]:border [&_td]:border [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs [&_th]:border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_ul]:mb-2 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-0.5"
                    remarkPlugins={[remarkGfm, remarkMath]}
                    allowedImagePrefixes={['data:']}
                    defaultOrigin="https://localhost"
                  >
                    {allTextContent}
                  </Streamdown>
                </div>
              )
            }
            return null
          })()}

          {/* Show message if no content and stream is finished */}
          <NoContentMessage message={message} />
        </div>

        {/* Timestamp and Token Usage */}
        <div className="mt-2 flex items-center justify-between">
          <div className="text-muted-foreground text-xs">
            {formatDistanceToNow(
              message.metadata?.createdAt
                ? new Date(message.metadata.createdAt)
                : new Date(),
              { addSuffix: true }
            )}
            {message.metadata?.model && (
              <span className="text-muted-foreground/70 ml-2">
                • {message.metadata.model}
              </span>
            )}
          </div>

          {/* Show token usage for assistant messages */}
          {message.role === 'assistant' && message.metadata?.totalUsage && (
            <TokenUsage
              usage={message.metadata.totalUsage}
              responseTime={message.metadata.responseTime}
            />
          )}
        </div>
      </div>
    </div>
  )
}
