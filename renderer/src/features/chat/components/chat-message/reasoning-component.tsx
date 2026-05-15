import { memo, useId } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { cjk } from '@streamdown/cjk'
import type { ChatStatus } from 'ai'
import type { ChatUIMessage } from '../../types'
import { useDisclosure } from '../../lib/disclosure-store'

interface ReasoningComponentProps {
  part: ChatUIMessage['parts'][0]
  status: ChatStatus
  /**
   * Stable key (typically `${message.id}:${partIndex}`) so the open/closed
   * flag survives unmounts when virtualized rows recycle. When omitted, the
   * component falls back to a per-instance `useId` and behaves like local
   * state — preserved for callers/tests that don't need cross-mount state.
   */
  disclosureKey?: string
}

function ReasoningComponentImpl({
  part,
  status,
  disclosureKey,
}: ReasoningComponentProps) {
  const fallbackKey = useId()
  const [isOpen, toggle] = useDisclosure(
    `${disclosureKey ?? fallbackKey}:reasoning`
  )

  if (part.type !== 'reasoning') return null

  return (
    <div className="bg-card mb-3 rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Brain className="text-info h-4 w-4" />
        <span className="text-foreground text-sm font-medium">
          AI Reasoning
        </span>
      </div>

      <div className="mb-2">
        <button
          onClick={toggle}
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
                plugins={{ code, mermaid, cjk }}
                isAnimating={status === 'streaming'}
                className="prose prose-sm max-w-none"
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

export const ReasoningComponent = memo(ReasoningComponentImpl)
