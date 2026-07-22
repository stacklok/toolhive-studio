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
 * Reasoning-only turns serialize to empty assistant `content` on some
 * providers. Tool-only turns must stay unpadded so adapters can emit
 * null/omitted content alongside tool_calls (whitespace-only text is
 * rejected by strict Kimi-compatible gateways).
 */
function ensureAssistantWireText(message: ChatUIMessage): ChatUIMessage {
  if (message.role !== 'assistant') return message
  const { hasText, hasTool, hasReasoning } = getAssistantPartFlags(message)
  if (hasText || hasTool || !hasReasoning) return message
  return {
    ...message,
    parts: [...(message.parts ?? []), { type: 'text', text: ' ' }],
  }
}

/** Merge consecutive user turns after hollow removal heals role alternation. */
function coalesceAdjacentUserMessages(
  messages: ChatUIMessage[]
): ChatUIMessage[] {
  const result: ChatUIMessage[] = []
  for (const message of messages) {
    const previous = result.at(-1)
    if (message.role === 'user' && previous?.role === 'user') {
      result[result.length - 1] = {
        ...previous,
        parts: [...(previous.parts ?? []), ...(message.parts ?? [])],
      }
      continue
    }
    result.push(message)
  }
  return result
}

/**
 * Drop hollow assistants, coalesce adjacent user turns for strict role
 * alternation, and pad reasoning-only turns for wire compatibility.
 */
export function sanitizeMessagesForModel(
  messages: ChatUIMessage[]
): ChatUIMessage[] {
  return coalesceAdjacentUserMessages(
    messages
      .filter((message) => !isHollowAssistantMessage(message))
      .map(ensureAssistantWireText)
  )
}
