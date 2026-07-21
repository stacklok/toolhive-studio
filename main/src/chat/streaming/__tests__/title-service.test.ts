import '../../runtime/__tests__/setup'
import { describe, expect, it } from 'vitest'
import type { ChatUIMessage } from '../../types'
import { fallbackTitleFromUser, shouldAutoTitleThread } from '../title-service'

function msg(
  partial: Pick<ChatUIMessage, 'id' | 'role' | 'parts'>
): ChatUIMessage {
  return partial as ChatUIMessage
}

describe('shouldAutoTitleThread', () => {
  const userMsg = msg({
    id: 'u1',
    role: 'user',
    parts: [{ type: 'text', text: 'How do I deploy this app?' }],
  })

  it('returns false when the user edited the title', () => {
    expect(
      shouldAutoTitleThread(
        {
          id: 't1',
          title: 'Manual',
          titleEditedByUser: true,
          messages: [userMsg],
          lastEditTimestamp: 0,
          createdAt: 0,
        },
        userMsg
      )
    ).toBe(false)
  })

  it('returns false when a custom title already exists', () => {
    expect(
      shouldAutoTitleThread(
        {
          id: 't1',
          title: 'Deploy Planning',
          titleEditedByUser: false,
          messages: [userMsg],
          lastEditTimestamp: 0,
          createdAt: 0,
        },
        userMsg
      )
    ).toBe(false)
  })

  it('returns false after the first assistant exchange', () => {
    expect(
      shouldAutoTitleThread(
        {
          id: 't1',
          title: undefined,
          titleEditedByUser: false,
          messages: [
            userMsg,
            msg({
              id: 'a1',
              role: 'assistant',
              parts: [{ type: 'text', text: 'Use Docker' }],
            }),
            msg({
              id: 'u2',
              role: 'user',
              parts: [{ type: 'text', text: 'Thanks' }],
            }),
            msg({
              id: 'a2',
              role: 'assistant',
              parts: [{ type: 'text', text: 'Welcome' }],
            }),
          ],
          lastEditTimestamp: 0,
          createdAt: 0,
        },
        userMsg
      )
    ).toBe(false)
  })

  it('returns true for the first exchange with no custom title', () => {
    expect(
      shouldAutoTitleThread(
        {
          id: 't1',
          title: undefined,
          titleEditedByUser: false,
          messages: [
            userMsg,
            msg({
              id: 'a1',
              role: 'assistant',
              parts: [{ type: 'text', text: 'Use Docker' }],
            }),
          ],
          lastEditTimestamp: 0,
          createdAt: 0,
        },
        userMsg
      )
    ).toBe(true)
  })

  it('returns true when the title matches the user-message fallback', () => {
    const fallback = fallbackTitleFromUser(userMsg)
    expect(
      shouldAutoTitleThread(
        {
          id: 't1',
          title: fallback,
          titleEditedByUser: false,
          messages: [
            userMsg,
            msg({
              id: 'a1',
              role: 'assistant',
              parts: [{ type: 'text', text: 'Use Docker' }],
            }),
          ],
          lastEditTimestamp: 0,
          createdAt: 0,
        },
        userMsg
      )
    ).toBe(true)
  })
})
