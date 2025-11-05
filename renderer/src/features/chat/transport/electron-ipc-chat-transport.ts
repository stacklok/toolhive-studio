import type { ChatTransport, UIMessageChunk, ChatRequestOptions } from 'ai'
import type { QueryClient } from '@tanstack/react-query'
import type { ChatUIMessage } from '../types'
import { isLocalServerProvider } from '../lib/utils'

interface ElectronIPCChatTransportConfig {
  queryClient: QueryClient
}

/**
 * Custom chat transport for Electron IPC that implements the AI SDK ChatTransport interface
 */
export class ElectronIPCChatTransport implements ChatTransport<ChatUIMessage> {
  constructor(private config: ElectronIPCChatTransportConfig) {}

  private async getSettingsFromQuery(): Promise<
    | {
        provider: 'ollama' | 'lmstudio'
        model: string
        endpointURL: string
        enabledTools: string[]
      }
    | {
        provider: string
        model: string
        apiKey: string
        enabledTools: string[]
      }
  > {
    // Get selected model from cache
    const selectedModel = this.config.queryClient.getQueryData<{
      provider: string
      model: string
    }>(['chat', 'selectedModel'])

    if (!selectedModel?.provider) {
      return { provider: '', model: '', apiKey: '', enabledTools: [] }
    }

    // Get provider settings from cache
    // Settings can be either local server (with endpointURL) or cloud providers (with apiKey)
    const providerSettings = this.config.queryClient.getQueryData<
      | {
          providerId: 'ollama' | 'lmstudio'
          endpointURL: string
          enabledTools: string[]
        }
      | { providerId: string; apiKey: string; enabledTools: string[] }
    >(['chat', 'settings', selectedModel.provider])

    // Build discriminated union based on provider
    if (isLocalServerProvider(selectedModel.provider)) {
      const endpointURL =
        providerSettings && 'endpointURL' in providerSettings
          ? providerSettings.endpointURL || ''
          : ''

      return {
        provider: selectedModel.provider,
        model: selectedModel.model,
        endpointURL,
        enabledTools: providerSettings?.enabledTools || [],
      }
    } else {
      const apiKey =
        providerSettings && 'apiKey' in providerSettings
          ? providerSettings.apiKey || ''
          : ''

      return {
        provider: selectedModel.provider,
        model: selectedModel.model,
        apiKey,
        enabledTools: providerSettings?.enabledTools || [],
      }
    }
  }

  private processMessagesForIPC(messages: ChatUIMessage[]): ChatUIMessage[] {
    return messages.map((message) => {
      if (!message.parts?.length) {
        return message
      }

      // Files should already be in data URL format from PromptInput
      message.parts.forEach((part) => {
        if (
          part.type === 'file' &&
          'url' in part &&
          part.url?.startsWith('blob:')
        ) {
          console.warn(
            'Unexpected blob URL found - files should already be base64:',
            part.filename
          )
        }
      })

      return message
    })
  }

  async sendMessages(
    options: {
      trigger: 'submit-message' | 'regenerate-message'
      chatId: string
      messageId: string | undefined
      messages: ChatUIMessage[]
      abortSignal: AbortSignal | undefined
    } & ChatRequestOptions
  ): Promise<ReadableStream<UIMessageChunk>> {
    const settings = await this.getSettingsFromQuery()

    // Validate settings based on provider type
    if (!settings.provider || !settings.model) {
      throw new Error('Please select an AI model in the settings')
    }

    // Process messages for IPC (files should already be base64)
    const processedMessages = this.processMessagesForIPC(options.messages)

    // Build request with proper discriminated union based on provider type
    let backendRequest
    if (settings.provider === 'ollama' || settings.provider === 'lmstudio') {
      // TypeScript narrows settings to local server type (Ollama/LM Studio)
      if (
        !('endpointURL' in settings) ||
        !settings.endpointURL ||
        !settings.endpointURL.trim()
      ) {
        throw new Error('Please configure your endpoint URL in the settings')
      }
      backendRequest = {
        chatId: options.chatId,
        messages: processedMessages,
        provider: settings.provider,
        model: settings.model,
        endpointURL: settings.endpointURL,
        enabledTools: settings.enabledTools || [],
      }
    } else {
      // TypeScript narrows settings to API key type here
      if (
        !('apiKey' in settings) ||
        !settings.apiKey ||
        !settings.apiKey.trim()
      ) {
        throw new Error('Please configure your API key in the settings')
      }
      backendRequest = {
        chatId: options.chatId,
        messages: processedMessages,
        provider: settings.provider,
        model: settings.model,
        apiKey: settings.apiKey,
        enabledTools: settings.enabledTools || [],
      }
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

          // Handle abort signal
          if (options.abortSignal) {
            const handleAbort = () => {
              if (!isClosed) {
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
