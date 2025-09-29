import type { WebContents } from 'electron'
import log from '../logger'
import type { AsyncIterableStream, InferUIMessageChunk } from 'ai'
import type { ChatUIMessage } from './types'

/**
 * Send an async iterable stream over IPC as real-time events
 */
function sendAsyncIterable<T>(
  sender: WebContents,
  channel: string,
  streamId: string,
  iterable: AsyncIterable<T>,
  onComplete?: () => void | Promise<void>
) {
  ;(async () => {
    try {
      for await (const item of iterable) {
        sender.send(`${channel}:chunk`, { streamId, chunk: item })
      }

      sender.send(`${channel}:end`, { streamId })

      // Call cleanup callback after successful completion
      if (onComplete) {
        await onComplete()
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      sender.send(`${channel}:error`, { streamId, error: errorMessage })
      log.error(`[STREAM] Stream ${streamId} failed:`, error)

      // Call cleanup callback even on error
      if (onComplete) {
        try {
          await onComplete()
        } catch (cleanupError) {
          log.error(
            `[STREAM] Error during cleanup for stream ${streamId}:`,
            cleanupError
          )
        }
      }
    }
  })()
}

/**
 * Convert UI message stream to real-time IPC events
 */
export function streamUIMessagesOverIPC(
  sender: WebContents,
  streamId: string,
  uiMessageStream: AsyncIterableStream<InferUIMessageChunk<ChatUIMessage>>,
  onComplete?: () => void | Promise<void>
) {
  sendAsyncIterable(
    sender,
    'chat:stream',
    streamId,
    uiMessageStream,
    onComplete
  )
}
