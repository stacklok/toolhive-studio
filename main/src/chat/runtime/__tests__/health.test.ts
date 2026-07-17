import './setup'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  markChatRuntimeInitializing,
  markChatRuntimeReady,
  markChatRuntimeUnavailable,
  isChatRuntimeReady,
  getChatUnavailableReason,
} from '../health'
import { CHAT_UNAVAILABLE_USER_MESSAGE, ChatUnavailableError } from '../errors'
import { unavailableResult } from '../adapters'

describe('chat runtime health', () => {
  beforeEach(() => {
    markChatRuntimeInitializing()
  })

  it('starts in initializing state', () => {
    expect(isChatRuntimeReady()).toBe(false)
    expect(getChatUnavailableReason()).toBeUndefined()
  })

  it('marks ready after successful bootstrap', () => {
    markChatRuntimeReady()
    expect(isChatRuntimeReady()).toBe(true)
  })

  it('marks unavailable with a reason on failure', () => {
    markChatRuntimeUnavailable('layer_failed')
    expect(isChatRuntimeReady()).toBe(false)
    expect(getChatUnavailableReason()).toBe('layer_failed')
  })
})

describe('chat runtime adapters', () => {
  it('maps unavailable runtime to a stable IPC result', () => {
    expect(unavailableResult()).toEqual({
      success: false,
      error: CHAT_UNAVAILABLE_USER_MESSAGE,
    })
  })

  it('exposes a safe user message on ChatUnavailableError', () => {
    const error = new ChatUnavailableError({
      reason: 'runtime_not_ready',
      userMessage: CHAT_UNAVAILABLE_USER_MESSAGE,
    })
    expect(error.userMessage).toBe(CHAT_UNAVAILABLE_USER_MESSAGE)
  })
})
