import type { WebContents } from 'electron'
import { runChatPromise, runChatSyncOr } from './runtime'
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
  return runChatSyncOr(
    StreamRegistryService.subscribeToStream(chatId, sender),
    null
  )
}

export function unsubscribeFromStream(
  chatId: string,
  sender: WebContents
): void {
  runChatSyncOr(
    StreamRegistryService.unsubscribeFromStream(chatId, sender),
    undefined
  )
}

export function cancelStream(chatId: string): boolean {
  return runChatSyncOr(StreamRegistryService.cancelStream(chatId), false)
}

export function getActiveStreamId(chatId: string): string | null {
  return runChatSyncOr(StreamRegistryService.getActiveStreamId(chatId), null)
}

export function getStreamingChatIds(): string[] {
  return runChatSyncOr(StreamRegistryService.getStreamingChatIds(), [])
}

export function setToolUiMetadata(
  chatId: string,
  metadata: Record<string, unknown>
): void {
  runChatSyncOr(
    StreamRegistryService.setToolUiMetadata(chatId, metadata),
    undefined
  )
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
