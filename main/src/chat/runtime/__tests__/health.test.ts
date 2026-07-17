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
import { Effect } from 'effect'
import {
  unavailableResult,
  runChatSyncOr,
  runChatPromiseOr,
  runChatSync,
} from '../adapters'
import {
  disposeChatRuntime,
  getManagedRuntime,
  initializeChatRuntime,
} from '../managed-runtime'
import { shutdownChatRuntime } from '../lifecycle'

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

  it('runChatSyncOr returns the fallback when the runtime is unavailable', () => {
    markChatRuntimeUnavailable('runtime_not_ready')
    expect(runChatSyncOr(Effect.succeed('ok'), 'fallback')).toBe('fallback')
  })

  it('runChatPromiseOr resolves to the fallback when the runtime is unavailable', async () => {
    markChatRuntimeUnavailable('runtime_not_ready')
    await expect(
      runChatPromiseOr(Effect.succeed('ok'), 'fallback')
    ).resolves.toBe('fallback')
  })

  it('getManagedRuntime is null while initializing even after construct', async () => {
    markChatRuntimeInitializing()
    await initializeChatRuntime()
    expect(getManagedRuntime()).toBeNull()
    markChatRuntimeReady()
    expect(getManagedRuntime()).not.toBeNull()
    await disposeChatRuntime()
    markChatRuntimeUnavailable('runtime_disposed')
  })

  it('runChatSync maps missing runtime to ChatUnavailableError, not a raw init error', async () => {
    markChatRuntimeReady()
    await disposeChatRuntime()
    expect(() => runChatSync(Effect.succeed('ok'))).toThrow(
      CHAT_UNAVAILABLE_USER_MESSAGE
    )
    markChatRuntimeUnavailable('runtime_disposed')
  })

  it('shutdown marks unavailable before dispose completes', async () => {
    await initializeChatRuntime()
    markChatRuntimeReady()
    await shutdownChatRuntime()
    expect(isChatRuntimeReady()).toBe(false)
    expect(getChatUnavailableReason()).toBe('runtime_disposed')
    expect(getManagedRuntime()).toBeNull()
  })
})
