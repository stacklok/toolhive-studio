import { ChevronDown, ChevronUp } from 'lucide-react'
import type { useExpandableText } from '@/common/hooks/use-expandable-text'

interface ExpandableTextProps {
  text: string
  expandKey: string
  expandableText: ReturnType<typeof useExpandableText>
  className?: string
}

export function ExpandableText({
  text,
  expandKey,
  expandableText,
  className,
}: ExpandableTextProps) {
  const isLong = expandableText.shouldCollapse(text)
  const isExpanded = expandableText.isExpanded(expandKey)

  if (!isLong) {
    return <span className={className}>{text}</span>
  }

  return (
    <div className={`space-y-1 ${className || ''}`}>
      <span>
        {isExpanded ? text : `${text.slice(0, expandableText.lengthLimit)}...`}
      </span>
      <button
        onClick={() => expandableText.toggle(expandKey)}
        className="text-primary hover:text-primary/80 flex items-center gap-1
          text-sm font-medium transition-colors"
        type="button"
      >
        {isExpanded ? (
          <>
            <span>Show less</span>
            <ChevronUp className="size-4" />
          </>
        ) : (
          <>
            <span>Show more</span>
            <ChevronDown className="size-4" />
          </>
        )}
      </button>
    </div>
  )
}
