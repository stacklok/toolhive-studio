import { beforeEach, afterEach } from 'vitest'
import { disposeChatRuntime, initializeChatRuntime } from './managed-runtime'
import {
  markChatRuntimeInitializing,
  markChatRuntimeReady,
  markChatRuntimeUnavailable,
} from './health'
import { _resetActiveStreamsForTests } from '../streaming/stream-registry-service'

async function ensureChatTestRuntime(): Promise<void> {
  await disposeChatRuntime()
  markChatRuntimeInitializing()
  try {
    await initializeChatRuntime()
    markChatRuntimeReady()
  } catch {
    markChatRuntimeUnavailable('test_runtime_init_failed')
  }
}

export function installChatTestRuntimeHooks(): void {
  beforeEach(async () => {
    await ensureChatTestRuntime()
  })

  afterEach(async () => {
    _resetActiveStreamsForTests()
    await disposeChatRuntime()
    markChatRuntimeUnavailable('test_runtime_disposed')
  })
}
