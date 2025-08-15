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
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TokenUsage } from './token-usage'
import { NoContentMessage } from './no-content-message'
import { useState } from 'react'
import type { ChatUIMessage } from '../types'

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
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {'text' in part
                  ? part.text || 'No reasoning content'
                  : 'No reasoning content'}
              </ReactMarkdown>
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
              <pre
                className="bg-background max-h-60 overflow-x-auto rounded border
                  p-2 text-xs"
              >
                {JSON.stringify(part.output, null, 2)}
              </pre>
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

  if (isUser) {
    // User message with bubble styling
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[80%] items-start gap-3">
          {/* Message Content */}
          <div className="space-y-2">
            <div
              className="bg-primary text-primary-foreground rounded-2xl
                rounded-br-md px-4 py-3 shadow-sm"
            >
              <div className="break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="mb-0 last:mb-0">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic">{children}</em>
                    ),
                    code: ({ children }) => (
                      <code
                        className="bg-primary-foreground/20 rounded px-1 py-0.5
                          font-mono text-sm"
                      >
                        {children}
                      </code>
                    ),
                  }}
                >
                  {message.parts.find((p) => p.type === 'text' && 'text' in p)
                    ?.text || ''}
                </ReactMarkdown>
              </div>
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
        <Bot className="h-4 w-4" />
      </div>

      {/* Message Content */}
      <div className="min-w-0 flex-1 space-y-2 pr-2">
        {/* Render message content - simplified for streaming */}
        <div className="break-words">
          {/* Render all message parts in order */}
          {message.parts.map((part, index) => {
            switch (part.type) {
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

              default:
                // Handle all tool-* parts
                if (part.type.startsWith('tool-')) {
                  return <ToolCallComponent key={`tool-${index}`} part={part} />
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
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Heading styles - balanced
                      h1: ({ children }) => (
                        <h1 className="text-foreground/85 mt-3 mb-2 text-lg font-semibold first:mt-0">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-foreground/80 mt-3 mb-2 text-base font-semibold first:mt-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-foreground/75 mt-2 mb-1 text-sm font-medium first:mt-0">
                          {children}
                        </h3>
                      ),
                      // List styles - balanced
                      ul: ({ children }) => (
                        <ul className="text-foreground/80 mb-2 list-inside list-disc space-y-0.5">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="text-foreground/80 mb-2 list-inside list-decimal space-y-0.5">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-foreground/80 ml-2 text-sm">
                          {children}
                        </li>
                      ),
                      // Table styles
                      table: ({ children }) => (
                        <div className="mb-4 overflow-x-auto">
                          <table className="border-border min-w-full rounded-md border">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border-border bg-muted/50 text-foreground/75 border px-3 py-2 text-left text-xs font-medium">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border-border text-foreground/80 border px-3 py-2 text-xs">
                          {children}
                        </td>
                      ),
                      // Code styles - balanced
                      code: ({ className, children }) => {
                        const isInline = !className
                        if (isInline) {
                          return (
                            <code className="bg-muted/70 text-foreground/85 rounded px-1 py-0.5 font-mono text-xs">
                              {children}
                            </code>
                          )
                        }
                        return (
                          <code className="text-foreground/80 font-mono text-xs">
                            {children}
                          </code>
                        )
                      },
                      pre: ({ children }) => (
                        <pre className="bg-muted/50 text-foreground/80 mb-3 overflow-x-auto rounded-md p-3 text-xs">
                          {children}
                        </pre>
                      ),
                      // Link styles
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {children}
                        </a>
                      ),
                      // Text styles - balanced
                      p: ({ children }) => (
                        <p className="text-foreground/80 mb-2 leading-relaxed last:mb-0">
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-foreground/90 font-medium">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-foreground/75 italic">
                          {children}
                        </em>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-muted-foreground/30 mb-3 border-l-4 pl-4 italic">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {allTextContent}
                  </ReactMarkdown>
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
