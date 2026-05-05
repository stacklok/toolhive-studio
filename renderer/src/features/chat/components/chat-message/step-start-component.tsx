import { memo } from 'react'
import { Zap } from 'lucide-react'
import type { ChatUIMessage } from '../../types'

interface StepStartComponentProps {
  part: ChatUIMessage['parts'][0]
  index: number
}

function StepStartComponentImpl({ part, index }: StepStartComponentProps) {
  if (part.type !== 'step-start') return null

  // Show step boundaries as horizontal lines (skip first step).
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

export const StepStartComponent = memo(StepStartComponentImpl)
