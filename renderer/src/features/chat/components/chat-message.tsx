import { formatDistanceToNow } from 'date-fns'
import { User, Bot, Wrench, CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/common/components/ui/badge'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  timestamp?: Date
  parts: Array<{
    type: string
    text?: string
    // Legacy dynamic-tool properties
    toolName?: string
    toolCallId?: string
    state?: string
    input?: unknown
    output?: unknown
    errorText?: string
    // AI SDK v5 tool-call properties
    args?: Record<string, unknown>
    // AI SDK v5 tool-result properties
    result?: unknown
  }>
}

interface ChatMessageProps {
  message: UIMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className="flex items-start gap-4">
      {/* Simple role indicator */}
      <div
        className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center
          rounded-lg"
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="space-y-3">
          {message.parts.map((part, index) => {
            switch (part.type) {
              case 'text':
                return (
                  <div key={index} className="break-words">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Basic heading styles
                        h1: ({ children }) => (
                          <h1 className="mt-4 mb-2 text-xl font-bold first:mt-0">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="mt-3 mb-2 text-lg font-bold first:mt-0">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="mt-3 mb-2 text-base font-bold first:mt-0">
                            {children}
                          </h3>
                        ),
                        // List styles
                        ul: ({ children }) => (
                          <ul className="mb-2 list-inside list-disc space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="mb-2 list-inside list-decimal space-y-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="ml-2">{children}</li>
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
                          <th className="border-border bg-muted border px-3 py-2 text-left text-sm font-medium">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border-border border px-3 py-2 text-sm">
                            {children}
                          </td>
                        ),
                        // Code styles
                        code: ({ className, children }) => {
                          const isInline = !className
                          if (isInline) {
                            return (
                              <code className="bg-muted rounded px-1 py-0.5 font-mono text-sm">
                                {children}
                              </code>
                            )
                          }
                          return (
                            <code className="font-mono text-sm">
                              {children}
                            </code>
                          )
                        },
                        pre: ({ children }) => (
                          <pre className="bg-muted mb-3 overflow-x-auto rounded-md p-3 text-sm">
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
                        // Paragraph styles
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0">{children}</p>
                        ),
                        // Strong and emphasis
                        strong: ({ children }) => (
                          <strong className="font-bold">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic">{children}</em>
                        ),
                        // Blockquote
                        blockquote: ({ children }) => (
                          <blockquote className="border-muted-foreground/30 mb-3 border-l-4 pl-4 italic">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {part.text || ''}
                    </ReactMarkdown>
                  </div>
                )

              // Handle AI SDK v5 tool call parts
              case 'tool-call':
                return (
                  <div
                    key={index}
                    className="rounded border bg-blue-50 p-2 dark:bg-blue-950/30"
                  >
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-blue-600" />
                      <Badge variant="secondary" className="text-xs">
                        {part.toolName || 'Tool'}
                      </Badge>
                    </div>
                  </div>
                )

              case 'tool-result':
                // Don't display raw tool results - the AI should process them in its text response
                return (
                  <div
                    key={index}
                    className="rounded border bg-green-50 p-2 dark:bg-green-950/30"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <Badge variant="secondary" className="text-xs">
                        Tool completed
                      </Badge>
                    </div>
                  </div>
                )

              // Keep legacy dynamic-tool support for backward compatibility
              case 'dynamic-tool':
                return (
                  <div
                    key={index}
                    className="bg-background/50 rounded border p-2"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      <Badge variant="secondary" className="text-xs">
                        {part.toolName}
                      </Badge>
                      {part.state === 'output-available' && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                      {part.state === 'output-error' && (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                    </div>

                    {part.state === 'input-streaming' && (
                      <div className="text-muted-foreground text-xs">
                        Preparing tool call...
                      </div>
                    )}

                    {part.state === 'input-available' && (
                      <div className="text-muted-foreground text-xs">
                        Executing {part.toolName}...
                      </div>
                    )}

                    {part.state === 'output-available' && (
                      <div className="text-muted-foreground text-xs">
                        Tool completed successfully
                      </div>
                    )}

                    {part.state === 'output-error' && (
                      <div className="text-xs text-red-600">
                        Error: {part.errorText}
                      </div>
                    )}
                  </div>
                )

              default:
                return null
            }
          })}
        </div>

        {/* Timestamp */}
        <div className="text-muted-foreground mt-2 text-xs">
          {formatDistanceToNow(message.timestamp || new Date(), {
            addSuffix: true,
          })}
        </div>
      </div>
    </div>
  )
}
