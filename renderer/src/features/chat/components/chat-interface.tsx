import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/common/components/ui/button'
import { Trash2, MessageSquare, Plus, MessageCircleMore } from 'lucide-react'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { DialogApiKeys } from './dialog-api-keys'
import { McpServerSelector } from './mcp-server-selector'
import { ModelSelector } from './model-selector'
import { ErrorAlert } from './error-alert'
import { useChatStreaming } from '../hooks/use-chat-streaming'
import { useConfirm } from '@/common/hooks/use-confirm'
import { Separator } from '@/common/components/ui/separator'
import { McpServerSettings } from './mcp-server-settings'

function ChatInterfaceContent() {
  const {
    messages,
    isLoading,
    error,
    settings,
    sendMessage,
    clearMessages,
    cancelRequest,
    loadPersistedSettings,
    updateSettings,
    isPersistentLoading,
  } = useChatStreaming()
  const confirm = useConfirm()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleProviderChange = useCallback(
    (providerId: string) => {
      loadPersistedSettings(providerId)
    },
    [loadPersistedSettings]
  )

  // Simple smooth scroll to bottom - only when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  const hasProviderAndModel =
    settings.provider && settings.model && settings.apiKey
  const hasMessages = messages.length > 0

  const onClearMessages = useCallback(async () => {
    const confirmed = await confirm(
      'Are you sure you want to delete all messages?',
      {
        title: 'Clear messages',
        buttons: { yes: 'Delete', no: 'Cancel' },
        isDestructive: true,
      }
    )
    if (!confirmed) return
    clearMessages()
  }, [clearMessages, confirm])

  return (
    <div className="bg-background flex h-full flex-col">
      {hasProviderAndModel && (
        <>
          <div className="w-full pb-4">
            <div className="flex items-center gap-2">
              <ModelSelector
                settings={settings}
                onSettingsChange={updateSettings}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onProviderChange={handleProviderChange}
              />
              <McpServerSelector />
              {hasMessages && (
                <Button
                  onClick={onClearMessages}
                  variant="secondary"
                  size="sm"
                  className="h-10 cursor-pointer font-light"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Chat
                </Button>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        {isPersistentLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <div
                  className="bg-muted-foreground h-2 w-2 animate-bounce
                    rounded-full [animation-delay:-0.3s]"
                ></div>
                <div
                  className="bg-muted-foreground h-2 w-2 animate-bounce
                    rounded-full [animation-delay:-0.15s]"
                ></div>
                <div
                  className="bg-muted-foreground h-2 w-2 animate-bounce
                    rounded-full"
                ></div>
              </div>
              <span className="text-muted-foreground text-sm">
                Loading chat history...
              </span>
            </div>
          </div>
        ) : hasMessages ? (
          <div className="h-full w-full overflow-y-auto scroll-smooth">
            <div className="space-y-6 pt-8 pr-2">
              {messages.map((message, index: number) => (
                <div
                  key={message.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-2
                    duration-300"
                  style={{
                    animationDelay: `${Math.min(index * 50, 200)}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <ChatMessage message={message} />
                </div>
              ))}
              {isLoading && (
                <div
                  className="animate-in fade-in-0 flex items-start gap-4
                    duration-500"
                >
                  <div
                    className="bg-muted flex h-8 w-8 shrink-0 items-center
                      justify-center rounded-lg"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div
                          className="bg-muted-foreground h-1.5 w-1.5
                            animate-bounce rounded-full [animation-delay:-0.3s]"
                        ></div>
                        <div
                          className="bg-muted-foreground h-1.5 w-1.5
                            animate-bounce rounded-full
                            [animation-delay:-0.15s]"
                        ></div>
                        <div
                          className="bg-muted-foreground h-1.5 w-1.5
                            animate-bounce rounded-full"
                        ></div>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <div className="max-w-xxl space-y-4 text-center">
              <div
                className="text-foreground font-display text-center text-4xl
                  font-bold"
              >
                {!hasProviderAndModel && (
                  <MessageCircleMore
                    strokeWidth={1}
                    size={100}
                    className="mx-auto mb-2 scale-x-[-1] font-light"
                  />
                )}
                Test & evaluate your MCP Servers
              </div>
              {!hasProviderAndModel && (
                <>
                  <p className="text-muted-foreground font-sans text-base">
                    Configure an AI service provider to use to test the
                    responses from your MCP servers
                  </p>
                  <Button
                    variant="default"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    <Plus /> Configure your API Keys
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <ErrorAlert error={error} />

      <div className="mx-auto w-full pt-4 pb-2">
        {hasProviderAndModel && (
          <div className="mb-4">
            <McpServerSettings />
          </div>
        )}

        {/* Chat Input */}
        <ChatInput
          onSendMessage={sendMessage}
          onStopGeneration={cancelRequest}
          isLoading={isLoading}
          disabled={!hasProviderAndModel}
          selectedModel={settings.model}
        />
      </div>

      {/* API Keys Modal */}
      <DialogApiKeys isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  )
}

export function ChatInterface() {
  return <ChatInterfaceContent />
}
