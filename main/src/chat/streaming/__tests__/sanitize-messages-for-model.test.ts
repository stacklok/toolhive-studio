import { describe, expect, it } from 'vitest'
import type { ChatUIMessage } from '../../types'
import {
  isHollowAssistantMessage,
  sanitizeMessagesForModel,
} from '../sanitize-messages-for-model'

function msg(
  partial: Pick<ChatUIMessage, 'id' | 'role' | 'parts'>
): ChatUIMessage {
  return partial as ChatUIMessage
}

describe('sanitizeMessagesForModel', () => {
  it('detects assistants with no parts as hollow', () => {
    expect(
      isHollowAssistantMessage(msg({ id: 'a1', role: 'assistant', parts: [] }))
    ).toBe(true)
  })

  it('detects step-start-only assistants as hollow', () => {
    expect(
      isHollowAssistantMessage(
        msg({
          id: 'a1',
          role: 'assistant',
          parts: [{ type: 'step-start' }],
        })
      )
    ).toBe(true)
  })

  it('keeps assistants with text, tools, or reasoning', () => {
    expect(
      isHollowAssistantMessage(
        msg({
          id: 'a1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'hi' }],
        })
      )
    ).toBe(false)
    expect(
      isHollowAssistantMessage(
        msg({
          id: 'a2',
          role: 'assistant',
          parts: [
            {
              type: 'dynamic-tool',
              toolName: 'x',
              toolCallId: 'c1',
              state: 'input-available',
              input: {},
            },
          ],
        })
      )
    ).toBe(false)
    expect(
      isHollowAssistantMessage(
        msg({
          id: 'a3',
          role: 'assistant',
          parts: [{ type: 'reasoning', text: 'think' }],
        })
      )
    ).toBe(false)
  })

  it('strips hollow assistants from the transcript', () => {
    const result = sanitizeMessagesForModel([
      msg({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }),
      msg({ id: 'a1', role: 'assistant', parts: [] }),
      msg({ id: 'u2', role: 'user', parts: [{ type: 'text', text: 'again' }] }),
    ])
    expect(result.map((m) => m.id)).toEqual(['u1', 'u2'])
  })

  it('adds a space text part to tool-only assistants', () => {
    const result = sanitizeMessagesForModel([
      msg({
        id: 'a1',
        role: 'assistant',
        parts: [
          {
            type: 'dynamic-tool',
            toolName: 'x',
            toolCallId: 'c1',
            state: 'input-available',
            input: {},
          },
        ],
      }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.parts.at(-1)).toEqual({ type: 'text', text: ' ' })
  })
})
