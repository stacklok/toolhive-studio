import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/common/components/ui/button'

import { Trash2, MessageSquare } from 'lucide-react'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { DialogApiKeys } from './dialog-api-keys'
import { McpServerSelector } from './mcp-server-selector'
import { ModelSelector } from './model-selector'
import { ErrorAlert } from './error-alert'

import { useChatStreaming } from '../hooks/use-chat-streaming'

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
  } = useChatStreaming()

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

  const hasProviderAndModel = settings.provider && settings.model
  const hasMessages = messages.length > 0

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Model Selection Bar */}
      <div
        className="border-border/20 bg-background/95
          supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur"
      >
        <div className="container mx-auto py-4">
          <div className="flex items-center justify-between">
            <ModelSelector
              settings={settings}
              onSettingsChange={updateSettings}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onProviderChange={handleProviderChange}
            />
            {hasMessages && (
              <Button
                onClick={clearMessages}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        {hasMessages ? (
          <div className="h-full overflow-y-auto scroll-smooth">
            <div className="container mx-auto py-8">
              <div className="space-y-8 pr-2">
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
                              animate-bounce rounded-full
                              [animation-delay:-0.3s]"
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
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <div className="max-w-lg space-y-4 text-center">
              {settings.provider && settings.model ? (
                <div
                  className="text-foreground text-3xl leading-tight font-light"
                >
                  How can I help you today?
                </div>
              ) : (
                <>
                  <div className="text-foreground text-2xl font-light">
                    Welcome to Chat Playground
                  </div>
                  <p className="text-muted-foreground text-base">
                    Select an AI model above to get started
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      <ErrorAlert error={error} />

      {/* Input Area */}
      <div
        className="border-border/20 bg-background/95
          supports-[backdrop-filter]:bg-background/60 border-t backdrop-blur"
      >
        <div className="container mx-auto py-6">
          {/* MCP Tools Selection */}
          {hasProviderAndModel && (
            <div className="mb-4">
              <McpServerSelector />
            </div>
          )}

          {/* Response Timer */}
          {isLoading && (
            <div className="flex justify-center pb-2">
              <div className="text-muted-foreground text-sm">
                Generating response...
              </div>
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
      </div>

      {/* API Keys Modal */}
      <DialogApiKeys isOpen={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  )
}

export function ChatInterface() {
  return <ChatInterfaceContent />
}
