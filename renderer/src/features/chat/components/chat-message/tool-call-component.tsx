import { memo, useState } from 'react'
import {
  Wrench,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { ChatStatus } from 'ai'
import type { ChatUIMessage } from '../../types'
import { ToolOutputContent } from './tool-output-content'

interface ToolCallComponentProps {
  part: ChatUIMessage['parts'][0]
  status: ChatStatus
}

function ToolCallComponentImpl({ part, status }: ToolCallComponentProps) {
  const [isInputOpen, setIsInputOpen] = useState(false)
  const [isOutputOpen, setIsOutputOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  if (!part.type.startsWith('tool-') && part.type !== 'dynamic-tool')
    return null

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
      <div className="mb-2 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-blue-500" />
        <span className="text-foreground text-sm font-medium">
          Tool: {toolName}
        </span>

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

        <span
          className="bg-muted text-muted-foreground rounded px-2 py-1 font-mono
            text-xs"
        >
          ID: {toolCallId.slice(-8)}
        </span>
      </div>

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
              <ToolOutputContent output={part.output} status={status} />
            </div>
          )}
        </div>
      )}

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

export const ToolCallComponent = memo(ToolCallComponentImpl)
