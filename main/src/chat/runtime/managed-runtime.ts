import { Effect, Layer, ManagedRuntime } from 'effect'
import { ChatLoggerLayer, ChatLogLevelLayer } from './logging'
import { ThreadsRepository } from '../threads/threads-repository'
import { ThreadsService } from '../threads/threads-service'
import { LegacyStoreService } from '../settings/legacy-store-service'
import { SettingsRepository } from '../settings/settings-service'
import { SettingsService } from '../settings/settings-service'
import { ThreadSettingsService } from '../settings/thread-settings-service'
import { AgentsService } from '../agents/agents-service'
import { PricingService } from '../pricing/pricing-service'
import { StreamRegistryService } from '../streaming/stream-registry-service'
import { ChatStreamService } from '../streaming/chat-stream-service'
import { McpService } from '../mcp/mcp-service'
import { ProvidersService } from '../providers/providers-service'
import { TitleService } from '../streaming/title-service'

export const ChatLiveLayer = Layer.mergeAll(
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

let managedRuntime: ManagedRuntime.ManagedRuntime<ChatServices, never> | null =
  null

export function getManagedRuntimeOrThrow(): ManagedRuntime.ManagedRuntime<
  ChatServices,
  never
> {
  if (!managedRuntime) {
    throw new Error('Chat runtime has not been initialized')
  }
  return managedRuntime
}

export async function initializeChatRuntime(): Promise<void> {
  if (managedRuntime) return
  managedRuntime = ManagedRuntime.make(ChatLiveLayer)
  await managedRuntime.runPromise(Effect.void)
}

export async function disposeChatRuntime(): Promise<void> {
  if (!managedRuntime) return
  const runtime = managedRuntime
  managedRuntime = null
  await runtime.dispose()
}

export function getChatRuntimeForTests(): ManagedRuntime.ManagedRuntime<
  ChatServices,
  never
> | null {
  return managedRuntime
}
