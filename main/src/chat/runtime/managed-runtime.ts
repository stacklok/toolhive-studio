import { Effect, Layer, ManagedRuntime } from 'effect'
import { ChatLoggerLayer, ChatLogLevelLayer } from './logging'
import { ThreadsRepository } from '../threads/threads-repository'
import { ThreadsService } from '../threads/threads-service'
import { LegacyStoreService } from '../settings/legacy-store-service'
import {
  SettingsRepository,
  SettingsService,
} from '../settings/settings-service'
import { ThreadSettingsService } from '../settings/thread-settings-service'
import { AgentsService } from '../agents/agents-service'
import { PricingService } from '../pricing/pricing-service'
import { StreamRegistryService } from '../streaming/stream-registry-service'
import { ChatStreamService } from '../streaming/chat-stream-service'
import { McpService } from '../mcp/mcp-service'
import { ProvidersService } from '../providers/providers-service'
import { TitleService } from '../streaming/title-service'
import {
  getManagedRuntimeInstance,
  setManagedRuntime,
  type AnyChatRuntime,
} from './runtime-ref'

const ChatLiveLayer = Layer.mergeAll(
  ChatLoggerLayer,
  ChatLogLevelLayer,
  ThreadsRepository.Default,
  ThreadsService.Default,
  LegacyStoreService.Default,
  SettingsRepository.Default,
  SettingsService.Default,
  ThreadSettingsService.Default,
  AgentsService.Default,
  PricingService.Default,
  McpService.Default,
  ProvidersService.Default,
  TitleService.Default,
  StreamRegistryService.Default,
  ChatStreamService.Default
)

export type ChatServices = Layer.Layer.Success<typeof ChatLiveLayer>

export type ChatRuntime = ManagedRuntime.ManagedRuntime<ChatServices, never>

export { getManagedRuntime, getManagedRuntimeInstance } from './runtime-ref'

export function getManagedRuntimeOrThrow(): ChatRuntime {
  const runtime = getManagedRuntimeInstance()
  if (!runtime) {
    throw new Error('Chat runtime has not been initialized')
  }
  return runtime as ChatRuntime
}

export async function initializeChatRuntime(): Promise<void> {
  if (getManagedRuntimeInstance()) return
  const runtime = ManagedRuntime.make(ChatLiveLayer) as AnyChatRuntime
  setManagedRuntime(runtime)
  await runtime.runPromise(Effect.void)
}

export async function disposeChatRuntime(): Promise<void> {
  const runtime = getManagedRuntimeInstance()
  if (!runtime) return
  setManagedRuntime(null)
  await runtime.dispose()
}
