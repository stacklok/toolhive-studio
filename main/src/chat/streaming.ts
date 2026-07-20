import type { WebContents } from 'electron'
import { runChatPromise } from './runtime'
import { ChatStreamService } from './streaming/chat-stream-service'
import type { ChatRequest } from './types'

export type { ChatRequest }

export async function handleChatStreamRealtime(
  request: ChatRequest,
  streamId: string,
  sender: WebContents
): Promise<void> {
  await runChatPromise(
    ChatStreamService.handleChatStreamRealtime(request, streamId, sender)
  )
}
