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

  it('treats whitespace-only text as hollow', () => {
    expect(
      isHollowAssistantMessage(
        msg({
          id: 'a1',
          role: 'assistant',
          parts: [{ type: 'text', text: '   ' }],
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

  it('coalesces adjacent users after removing a middle hollow assistant', () => {
    const result = sanitizeMessagesForModel([
      msg({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }),
      msg({ id: 'a1', role: 'assistant', parts: [] }),
      msg({ id: 'u2', role: 'user', parts: [{ type: 'text', text: 'again' }] }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('u1')
    expect(result[0]?.parts).toEqual([
      { type: 'text', text: 'hi' },
      { type: 'text', text: 'again' },
    ])
  })

  it('coalesces pre-existing adjacent user turns', () => {
    const result = sanitizeMessagesForModel([
      msg({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'first' }] }),
      msg({
        id: 'u2',
        role: 'user',
        parts: [{ type: 'text', text: 'second' }],
      }),
      msg({
        id: 'a1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'reply' }],
      }),
    ])
    expect(result.map((m) => m.id)).toEqual(['u1', 'a1'])
    expect(result[0]?.parts).toEqual([
      { type: 'text', text: 'first' },
      { type: 'text', text: 'second' },
    ])
  })

  it('preserves a valid transcript unchanged aside from wire padding', () => {
    const input = [
      msg({ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }),
      msg({
        id: 'a1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'hello' }],
      }),
    ]
    expect(sanitizeMessagesForModel(input)).toEqual(input)
  })

  it('does not pad tool-only assistants', () => {
    const toolOnly = msg({
      id: 'a1',
      role: 'assistant',
      parts: [
        {
          type: 'dynamic-tool',
          toolName: 'x',
          toolCallId: 'c1',
          state: 'output-available',
          input: {},
          output: 'done',
        },
      ],
    })
    const result = sanitizeMessagesForModel([toolOnly])
    expect(result).toHaveLength(1)
    expect(result[0]?.parts).toEqual(toolOnly.parts)
  })

  it('preserves incomplete tool-only assistants without wire padding', () => {
    const incompleteTool = msg({
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
    })
    const result = sanitizeMessagesForModel([incompleteTool])
    expect(result[0]?.parts).toEqual(incompleteTool.parts)
  })

  it('adds wire text to reasoning-only assistants', () => {
    const result = sanitizeMessagesForModel([
      msg({
        id: 'a1',
        role: 'assistant',
        parts: [{ type: 'reasoning', text: 'think' }],
      }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.parts.at(-1)).toEqual({ type: 'text', text: ' ' })
    expect(result[0]?.parts[0]).toEqual({ type: 'reasoning', text: 'think' })
  })

  it('keeps assistant with tool output after hollow removal from middle', () => {
    const result = sanitizeMessagesForModel([
      msg({
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'run tool' }],
      }),
      msg({ id: 'hollow', role: 'assistant', parts: [] }),
      msg({
        id: 'a1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'done' }],
      }),
      msg({
        id: 'u2',
        role: 'user',
        parts: [{ type: 'text', text: 'thanks' }],
      }),
    ])
    expect(result.map((m) => m.id)).toEqual(['u1', 'a1', 'u2'])
  })
})
