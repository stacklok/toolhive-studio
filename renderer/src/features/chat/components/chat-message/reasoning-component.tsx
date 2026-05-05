import { memo, useState } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { cjk } from '@streamdown/cjk'
import type { ChatStatus } from 'ai'
import type { ChatUIMessage } from '../../types'

interface ReasoningComponentProps {
  part: ChatUIMessage['parts'][0]
  status: ChatStatus
}

function ReasoningComponentImpl({ part, status }: ReasoningComponentProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (part.type !== 'reasoning') return null

  return (
    <div className="bg-card mb-3 rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Brain className="h-4 w-4 text-purple-500" />
        <span className="text-foreground text-sm font-medium">
          AI Reasoning
        </span>
      </div>

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
