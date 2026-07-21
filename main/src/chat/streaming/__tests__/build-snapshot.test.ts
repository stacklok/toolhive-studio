import '../../runtime/__tests__/setup'
import { describe, expect, it } from 'vitest'
import type { ChatUIMessage } from '../../types'
import { buildSnapshot } from '../stream-registry-persist'
import type { ActiveStream } from '../stream-registry-types'

function msg(
  partial: Pick<ChatUIMessage, 'id' | 'role' | 'parts'>
): ChatUIMessage {
  return partial as ChatUIMessage
}

function makeStream(
  overrides: Partial<ActiveStream> &
    Pick<ActiveStream, 'originalMessages' | 'runningMessage'>
): ActiveStream {
  return {
    chatId: 'thread-1',
    streamId: 'stream-1',
    subscribers: new Set(),
    persistTimer: null,
    pendingWrite: false,
    abortController: new AbortController(),
    status: 'streaming',
    toolUiMetadata: null,
    persistFailed: false,
    messageId: undefined,
    blockOrder: [],
    textParts: new Map(),
    reasoningParts: new Map(),
    toolParts: new Map(),
    ...overrides,
  }
}

describe('buildSnapshot', () => {
  it('skips a hollow running assistant placeholder', () => {
    const user = msg({
      id: 'u1',
      role: 'user',
      parts: [{ type: 'text', text: 'hi' }],
    })
    const hollow = msg({ id: 'a1', role: 'assistant', parts: [] })
    const snapshot = buildSnapshot(
      makeStream({
        originalMessages: [user],
        runningMessage: hollow,
      })
    )
    expect(snapshot).toEqual([user])
  })

  it('includes a running assistant that has text', () => {
    const user = msg({
      id: 'u1',
      role: 'user',
      parts: [{ type: 'text', text: 'hi' }],
    })
    const assistant = msg({
      id: 'a1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'hello' }],
    })
    const snapshot = buildSnapshot(
      makeStream({
        originalMessages: [user],
        runningMessage: assistant,
      })
    )
    expect(snapshot).toEqual([user, assistant])
  })

  it('heals legacy hollow assistants already in originalMessages', () => {
    const user = msg({
      id: 'u1',
      role: 'user',
      parts: [{ type: 'text', text: 'hi' }],
    })
    const hollow = msg({ id: 'a-hollow', role: 'assistant', parts: [] })
    const assistant = msg({
      id: 'a1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'hello' }],
    })
    const snapshot = buildSnapshot(
      makeStream({
        originalMessages: [user, hollow],
        runningMessage: assistant,
      })
    )
    expect(snapshot.map((m) => m.id)).toEqual(['u1', 'a1'])
  })

  it('returns originalMessages when there is no running message, minus hollows', () => {
    const user = msg({
      id: 'u1',
      role: 'user',
      parts: [{ type: 'text', text: 'hi' }],
    })
    const hollow = msg({ id: 'a-hollow', role: 'assistant', parts: [] })
    const snapshot = buildSnapshot(
      makeStream({
        originalMessages: [user, hollow],
        runningMessage: undefined,
      })
    )
    expect(snapshot).toEqual([user])
  })
})
