import log from '../../logger'
import {
  disposeChatRuntime,
  getManagedRuntimeOrThrow,
  initializeChatRuntime,
} from './managed-runtime'
import {
  markChatRuntimeInitializing,
  markChatRuntimeReady,
  markChatRuntimeUnavailable,
} from './health'
import { AgentsService } from '../agents/agents-service'
import { SettingsService } from '../settings/settings-service'
import { shutdownAllActiveStreams } from '../streaming/stream-registry-service'

export async function bootstrapChatRuntime(): Promise<void> {
  markChatRuntimeInitializing()
  try {
    await initializeChatRuntime()
    const runtime = getManagedRuntimeOrThrow()
    await runtime.runPromise(AgentsService.seedBuiltinAgents())
    await runtime.runPromise(SettingsService.reconcileEnabledMcpTools())
    markChatRuntimeReady()
    log.info('[CHAT] Effect runtime initialized')
  } catch (error) {
    markChatRuntimeUnavailable(
      error instanceof Error ? error.message : 'unknown initialization error'
    )
    log.error('[CHAT] Effect runtime initialization failed:', error)
  }
}

export async function shutdownChatRuntime(): Promise<void> {
  try {
    // Flush active streams while the runtime is still ready so snapshot
    // persistence can use getManagedRuntime(). Marking unavailable first
    // would make every shutdown flush fail silently.
    shutdownAllActiveStreams()
    // Then block new IPC work before dispose so adapters never observe
    // ready=true with a null ManagedRuntime mid-teardown.
    markChatRuntimeUnavailable('runtime_disposing')
    await disposeChatRuntime()
    markChatRuntimeUnavailable('runtime_disposed')
    log.info('[CHAT] Effect runtime disposed')
  } catch (error) {
    markChatRuntimeUnavailable('runtime_dispose_failed')
    log.error('[CHAT] Effect runtime disposal failed:', error)
  }
}
