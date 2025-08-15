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
      return new ReadableStream<UIMessageChunk>({
        start(controller) {
          let isClosed = false

          // Listen for stream chunks
          const handleChunk = (...args: unknown[]) => {
            const data = args[0] as { streamId: string; chunk: UIMessageChunk }
            if (data && data.streamId === streamId && !isClosed) {
              try {
                // Enqueue the UIMessageChunk directly
                controller.enqueue(data.chunk)
              } catch (error) {
                console.warn(
                  'Failed to enqueue chunk (stream likely closed):',
                  error
                )
                isClosed = true
              }
            }
          }

          // Listen for stream end
          const handleEnd = (...args: unknown[]) => {
            const data = args[0] as { streamId: string }
            if (data && data.streamId === streamId && !isClosed) {
              try {
                controller.close()
                isClosed = true
              } catch (error) {
                console.warn('Failed to close stream (already closed):', error)
              }
              // Clean up listeners
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

          // Listen for stream errors
          const handleError = (...args: unknown[]) => {
            const data = args[0] as { streamId: string; error: string }
            if (data && data.streamId === streamId && !isClosed) {
              try {
                controller.error(new Error(data.error))
                isClosed = true
              } catch (error) {
                console.warn('Failed to error stream (already closed):', error)
              }
              // Clean up listeners
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

          // Set up IPC listeners

          window.electronAPI.on?.('chat:stream:chunk', handleChunk)
          window.electronAPI.on?.('chat:stream:end', handleEnd)
          window.electronAPI.on?.('chat:stream:error', handleError)
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
