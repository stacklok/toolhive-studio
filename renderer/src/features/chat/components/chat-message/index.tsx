import { memo } from 'react'
import type { ChatStatus } from 'ai'
import type { ChatUIMessage } from '../../types'
import type { ToolUiMetadataEntry } from '../../hooks/use-mcp-app-metadata'
import { UserMessage } from './user-message'
import { AssistantMessage } from './assistant-message'

interface ChatMessageProps {
  message: ChatUIMessage
  status: ChatStatus
  toolUiMetadata: Record<string, ToolUiMetadataEntry>
}

function ChatMessageImpl({
  message,
  status,
  toolUiMetadata,
}: ChatMessageProps) {
  if (message.role === 'user') {
    return <UserMessage message={message} status={status} />
  }
  return (
    <AssistantMessage
      message={message}
      status={status}
      toolUiMetadata={toolUiMetadata}
    />
  )
}

// Memoized so streaming ticks only re-render the row whose `message` ref
// changed; sibling rows skip thanks to shallow prop equality.
export const ChatMessage = memo(ChatMessageImpl)
