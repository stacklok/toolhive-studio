import type { WebContents } from 'electron'
import { isChatRuntimeReady, runChatPromise, runChatSync } from './runtime'
import {
  StreamRegistryService,
  purgeSender as purgeSenderImpl,
  _resetActiveStreamsForTests as resetActiveStreamsImpl,
} from './streaming/stream-registry-service'
import type { RunStreamOptions } from './streaming/stream-registry-service'

export type { RunStreamOptions }

export async function runManagedStream(
  options: RunStreamOptions
): Promise<void> {
  return runChatPromise(StreamRegistryService.runManagedStream(options))
}

export function subscribeToStream(chatId: string, sender: WebContents) {
  return runChatSync(StreamRegistryService.subscribeToStream(chatId, sender))
}

export function unsubscribeFromStream(
  chatId: string,
  sender: WebContents
): void {
  if (!isChatRuntimeReady()) return
  runChatSync(StreamRegistryService.unsubscribeFromStream(chatId, sender))
}

export function cancelStream(chatId: string): boolean {
  if (!isChatRuntimeReady()) return false
  return runChatSync(StreamRegistryService.cancelStream(chatId))
}

export function getActiveStreamId(chatId: string): string | null {
  if (!isChatRuntimeReady()) return null
  return runChatSync(StreamRegistryService.getActiveStreamId(chatId))
}

export function getStreamingChatIds(): string[] {
  if (!isChatRuntimeReady()) return []
  return runChatSync(StreamRegistryService.getStreamingChatIds())
}

export function setToolUiMetadata(
  chatId: string,
  metadata: Record<string, unknown>
): void {
  if (!isChatRuntimeReady()) return
  runChatSync(StreamRegistryService.setToolUiMetadata(chatId, metadata))
}

/**
 * Best-effort subscriber cleanup on WebContents destroy.
 * Must not go through the managed runtime — quit disposes the runtime
 * before windows are destroyed, and this listener still fires.
 */
export function purgeSender(sender: WebContents): void {
  purgeSenderImpl(sender)
}

/** Test-only helper. */
export function _resetActiveStreamsForTests(): void {
  resetActiveStreamsImpl()
}
