import { memo, useId } from 'react'
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
import { useDisclosure } from '../../lib/disclosure-store'

interface ToolCallComponentProps {
  part: ChatUIMessage['parts'][0]
  status: ChatStatus
  /**
   * Stable key (typically `${message.id}:${partIndex}`) so the three
   * expand/collapse flags survive unmounts when virtualized rows recycle.
   * When omitted, falls back to a per-instance `useId` so callers/tests
   * that don't need cross-mount state are unaffected.
   */
  disclosureKey?: string
}

function ToolCallComponentImpl({
  part,
  status,
  disclosureKey,
}: ToolCallComponentProps) {
  const fallbackKey = useId()
  const baseKey = disclosureKey ?? fallbackKey
  const [isDetailsOpen, toggleDetails] = useDisclosure(`${baseKey}:details`)
  const [isInputOpen, toggleInput] = useDisclosure(`${baseKey}:input`)
  const [isOutputOpen, toggleOutput] = useDisclosure(`${baseKey}:output`)

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
        <Wrench className="text-info h-4 w-4" />
        <span className="text-foreground text-sm font-medium">
          Tool: {toolName}
        </span>

        {state === 'output-available' && (
          <CheckCircle className="text-success h-4 w-4" />
        )}
        {state === 'output-error' && (
          <AlertCircle className="text-destructive h-4 w-4" />
        )}
        {state === 'input-streaming' && (
          <div className="flex items-center gap-1">
            <div
              className="border-info h-3 w-3 animate-spin rounded-full border
                border-t-transparent"
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
          onClick={toggleDetails}
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
            onClick={toggleInput}
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
              <span className="text-info">(Streaming...)</span>
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
            onClick={toggleOutput}
            className="text-muted-foreground hover:text-foreground flex
              items-center gap-2 text-xs transition-colors"
          >
            {isOutputOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span>Tool Result</span>
            <CheckCircle className="text-success h-3 w-3" />
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
          className="border-destructive/20 bg-destructive/10 mt-2 rounded border
            p-2"
        >
          <div className="text-destructive flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            <strong>Tool Execution Error</strong>
          </div>
          <div className="text-destructive mt-1 text-xs">
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
              <span className="text-success">✓ Completed</span>
            )}
          {state === 'input-streaming' && (
            <span className="text-info">⏳ Processing...</span>
          )}
          {state === 'output-error' && (
            <span className="text-destructive">✗ Failed</span>
          )}
        </div>
      </div>
    </div>
  )
}

export const ToolCallComponent = memo(ToolCallComponentImpl)
