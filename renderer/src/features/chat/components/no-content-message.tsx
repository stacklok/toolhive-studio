import type { ChatUIMessage } from '../types'

interface NoContentMessageProps {
  message: ChatUIMessage
}
// Check for any text content
interface TextPart {
  type: 'text'
  text: string
}

export function NoContentMessage({ message }: NoContentMessageProps) {
  const hasTextContent = message.parts.some(
    (p): p is TextPart =>
      p.type === 'text' && 'text' in p && !!(p as TextPart).text.trim()
  )

  const hasActivity =
    message.parts.filter(
      (p) =>
        p.type.startsWith('tool-') ||
        p.type === 'dynamic-tool' ||
        ['reasoning', 'step-start'].includes(p.type) ||
        ('state' in p &&
          p.state &&
          ['input-streaming', 'input-available'].includes(p.state))
    ).length > 0

  // Check if the message is finished (has token usage metadata)
  const isFinished = !!message.metadata?.totalUsage

  // Only show "No response content" if the message is finished and has no content/activity
  if (isFinished && !hasTextContent && !hasActivity) {
    return (
      <div className="text-muted-foreground text-sm italic">
        No response content
      </div>
    )
  }

  return null
}
