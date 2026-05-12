import type { ChatUIMessage } from '../types'

/**
 * Extract the plain-text payload of a chat message for the Copy action.
 * Joins all `text` parts with blank lines; ignores tool calls, reasoning,
 * attachments, etc. (tool outputs already have their own copy affordance).
 * Returns a trimmed string — callers should treat `''` as "nothing to copy".
 */
export function getMessageCopyText(message: ChatUIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
    .map((p) => p.text)
    .join('\n\n')
    .trim()
}
