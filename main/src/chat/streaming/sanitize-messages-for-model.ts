import type { ChatUIMessage } from '../types'

type AssistantPartFlags = {
  hasText: boolean
  hasTool: boolean
  hasReasoning: boolean
}

function getAssistantPartFlags(message: ChatUIMessage): AssistantPartFlags {
  let hasText = false
  let hasTool = false
  let hasReasoning = false

  for (const part of message.parts ?? []) {
    if (part.type === 'text' && 'text' in part && part.text.trim()) {
      hasText = true
      continue
    }
    if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
      hasTool = true
      continue
    }
    if (
      part.type === 'reasoning' &&
      'text' in part &&
      typeof part.text === 'string' &&
      part.text.trim()
    ) {
      hasReasoning = true
    }
  }

  return { hasText, hasTool, hasReasoning }
}

/**
 * Assistant turns with no text, tools, or reasoning — e.g. a stream that
 * aborted after `start` and left `parts: []` in SQLite. Moonshot (and
 * similar providers) reject these as empty assistant messages.
 */
export function isHollowAssistantMessage(message: ChatUIMessage): boolean {
  if (message.role !== 'assistant') return false
  const { hasText, hasTool, hasReasoning } = getAssistantPartFlags(message)
  return !hasText && !hasTool && !hasReasoning
}

/**
 * OpenRouter serializes assistant `content` as `text || null`. Tool- or
 * reasoning-only turns therefore arrive at providers as an empty assistant
 * message. A single space keeps the wire payload non-empty without changing
 * the visible reply.
 */
function ensureAssistantWireText(message: ChatUIMessage): ChatUIMessage {
  if (message.role !== 'assistant') return message
  const { hasText, hasTool, hasReasoning } = getAssistantPartFlags(message)
  if (hasText || (!hasTool && !hasReasoning)) return message
  return {
    ...message,
    parts: [...(message.parts ?? []), { type: 'text', text: ' ' }],
  }
}

/**
 * Drop hollow assistants and ensure tool/reasoning-only turns have non-empty
 * text so providers like Moonshot accept the request.
 */
export function sanitizeMessagesForModel(
  messages: ChatUIMessage[]
): ChatUIMessage[] {
  return messages
    .filter((message) => !isHollowAssistantMessage(message))
    .map(ensureAssistantWireText)
}
