import type { ChatTransport, UIMessageChunk, ChatRequestOptions } from 'ai'
import type { ChatUIMessage } from '../types'

interface ElectronIPCChatTransportConfig {
  getSettings: () => Promise<{
    provider: string
    model: string
    apiKey: string
    enabledTools?: string[]
  }>
}

/**
 * Custom chat transport for Electron IPC that implements the AI SDK ChatTransport interface
 */
export class ElectronIPCChatTransport implements ChatTransport<ChatUIMessage> {
  constructor(private config: ElectronIPCChatTransportConfig) {}

  async sendMessages(
    options: {
      trigger: 'submit-message' | 'regenerate-message'
      chatId: string
      messageId: string | undefined
      messages: ChatUIMessage[]
      abortSignal: AbortSignal | undefined
    } & ChatRequestOptions
  ): Promise<ReadableStream<UIMessageChunk>> {
    const settings = await this.config.getSettings()

    if (
      !settings.provider ||
      !settings.model ||
      !settings.apiKey ||
      !settings.apiKey.trim()
    ) {
      console.error('Transport validation failed:', settings)
      throw new Error('Please configure your AI provider settings first')
    }

    const backendRequest = {
      messages: options.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts.map((part) => ({
          type: part.type,
          text: part.type === 'text' ? part.text : '',
        })),
      })),
      provider: settings.provider,
      model: settings.model,
      apiKey: settings.apiKey,
      enabledTools: settings.enabledTools || [],
    }

    try {
      // Start streaming and get stream ID
      const response = await window.electronAPI.chat.stream(backendRequest)
      const { streamId } = response as { streamId: string }

      // Create a readable stream that will be populated by IPC events
      let cleanup: (() => void) | null = null

      return new ReadableStream<UIMessageChunk>({
        start(controller) {
          let isClosed = false

          // Listen for stream chunks
          const handleChunk = (...args: unknown[]) => {
            const data = args[0] as { streamId: string; chunk: UIMessageChunk }
            if (data && data.streamId === streamId && !isClosed) {
              try {
                controller.enqueue(data.chunk)
              } catch {
                // Stream is already closed, clean up silently
                cleanup?.()
              }
            }
          }

          // Listen for stream end
          const handleEnd = (...args: unknown[]) => {
            const data = args[0] as { streamId: string }
            if (data && data.streamId === streamId && !isClosed) {
              try {
                controller.close()
              } catch {
                // Stream already closed, ignore
              }
              cleanup?.()
            }
          }

          // Listen for stream errors
          const handleError = (...args: unknown[]) => {
            const data = args[0] as { streamId: string; error: string }
            if (data && data.streamId === streamId && !isClosed) {
              try {
                controller.error(new Error(data.error))
              } catch {
                // Stream already closed, ignore
              }
              cleanup?.()
            }
          }

          // Clean up function to remove all listeners
          cleanup = () => {
            if (!isClosed) {
              isClosed = true
              clearTimeout(timeoutId)
              window.electronAPI.removeListener?.(
                'chat:stream:chunk',
                handleChunk
              )
              window.electronAPI.removeListener?.('chat:stream:end', handleEnd)
              window.electronAPI.removeListener?.(
                'chat:stream:error',
                handleError
              )
            }
          }

          // Add a timeout to detect stuck streams
          const timeoutId = setTimeout(() => {
            if (!isClosed) {
              console.warn(
                '[IPC Transport] Stream timeout - no activity for 5 minutes'
              )
              try {
                controller.error(
                  new Error('Stream timeout - no response from server')
                )
              } catch {
                // Stream already closed, ignore
              }
              cleanup?.()
            }
          }, 300000) // 5 minute timeout

          // Handle abort signal
          if (options.abortSignal) {
            const handleAbort = () => {
              if (!isClosed) {
                clearTimeout(timeoutId)
                try {
                  controller.error(new Error('Request aborted'))
                } catch {
                  // Stream already closed, ignore
                }
                cleanup?.()
              }
            }

            if (options.abortSignal.aborted) {
              // Already aborted
              handleAbort()
              return
            }

            options.abortSignal.addEventListener('abort', handleAbort)
          }

          // Set up IPC listeners
          window.electronAPI.on?.('chat:stream:chunk', handleChunk)
          window.electronAPI.on?.('chat:stream:end', handleEnd)
          window.electronAPI.on?.('chat:stream:error', handleError)
        },
        cancel() {
          // This is called when the stream is cancelled (e.g., by abort signal)
          // Clean up listeners to prevent further IPC events
          cleanup?.()
        },
      })
    } catch (error) {
      throw new Error(
        `IPC communication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    // For now, we don't support reconnection - return null
    return null
  }
}
