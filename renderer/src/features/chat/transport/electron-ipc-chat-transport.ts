import type { ChatTransport, UIMessageChunk, ChatRequestOptions } from 'ai'
import type { QueryClient } from '@tanstack/react-query'
import type { ChatUIMessage } from '../types'
import { isLocalServerProvider } from '../lib/utils'

interface ElectronIPCChatTransportConfig {
  queryClient: QueryClient
}

interface AttachOptions {
  streamId: string
  chatId: string
  bufferedChunks?: UIMessageChunk[]
  abortSignal?: AbortSignal
  /** Called when the stream cleans up (end/error/abort). The renderer can
   * use this to e.g. tell the main process to drop our subscription. */
  onClose?: () => void
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

  /**
   * Build a ReadableStream that bridges the main-process chat stream
   * (identified by streamId+chatId) into the renderer-side AI SDK
   * pipeline. Optionally replays a buffered backlog before attaching to
   * live IPC events — used by both `sendMessages` (no backlog) and
   * `reconnectToStream` (mid-stream backlog from the registry).
   */
  private attachToActiveStream(
    options: AttachOptions
  ): ReadableStream<UIMessageChunk> {
    const { streamId, chatId, bufferedChunks, abortSignal, onClose } = options

    let cleanup: (() => void) | null = null

    return new ReadableStream<UIMessageChunk>({
      start(controller) {
        let isClosed = false

        if (bufferedChunks && bufferedChunks.length > 0) {
          for (const chunk of bufferedChunks) {
            try {
              controller.enqueue(chunk)
            } catch {
              isClosed = true
              break
            }
          }
        }

        const matchesStream = (data: { streamId?: string; chatId?: string }) =>
          (data.streamId && data.streamId === streamId) ||
          (data.chatId && data.chatId === chatId)

        const handleChunk = (...args: unknown[]) => {
          const data = args[0] as {
            streamId: string
            chatId?: string
            chunk: UIMessageChunk
          }
          if (data && matchesStream(data) && !isClosed) {
            try {
              controller.enqueue(data.chunk)
            } catch {
              cleanup?.()
            }
          }
        }

        const handleEnd = (...args: unknown[]) => {
          const data = args[0] as { streamId: string; chatId?: string }
          if (data && matchesStream(data) && !isClosed) {
            try {
              controller.close()
            } catch {
              // already closed
            }
            cleanup?.()
          }
        }

        const handleError = (...args: unknown[]) => {
          const data = args[0] as {
            streamId: string
            chatId?: string
            error: string
          }
          if (data && matchesStream(data) && !isClosed) {
            try {
              controller.error(new Error(data.error))
            } catch {
              // already closed
            }
            cleanup?.()
          }
        }

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
            onClose?.()
          }
        }

        if (abortSignal) {
          const handleAbort = () => {
            if (!isClosed) {
              try {
                controller.error(new Error('Request aborted'))
              } catch {
                // already closed
              }
              cleanup?.()
            }
          }

          if (abortSignal.aborted) {
            handleAbort()
            return
          }

          abortSignal.addEventListener('abort', handleAbort)
        }

        window.electronAPI.on?.('chat:stream:chunk', handleChunk)
        window.electronAPI.on?.('chat:stream:end', handleEnd)
        window.electronAPI.on?.('chat:stream:error', handleError)
      },
      cancel() {
        cleanup?.()
      },
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
      const response = await window.electronAPI.chat.stream(backendRequest)
      const { streamId } = response as { streamId: string }

      return this.attachToActiveStream({
        streamId,
        chatId: options.chatId,
        abortSignal: options.abortSignal,
      })
    } catch (error) {
      throw new Error(
        `IPC communication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async reconnectToStream(options: {
    chatId: string
  }): Promise<ReadableStream<UIMessageChunk> | null> {
    if (!options.chatId) return null
    let resumed: {
      streamId: string
      bufferedChunks: unknown[]
      toolUiMetadata: Record<string, unknown> | null
    } | null = null
    try {
      resumed = await window.electronAPI.chat.resumeStream(options.chatId)
    } catch {
      return null
    }
    if (!resumed) return null
    const chatId = options.chatId
    return this.attachToActiveStream({
      streamId: resumed.streamId,
      chatId,
      bufferedChunks: resumed.bufferedChunks as UIMessageChunk[],
      onClose: () => {
        try {
          void window.electronAPI.chat.unsubscribeStream(chatId)
        } catch {
          // best effort
        }
      },
    })
  }
}
