import { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/common/components/ui/button'
import { Alert, AlertDescription } from '@/common/components/ui/alert'

import { Trash2, MessageSquare } from 'lucide-react'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { DialogApiKeys } from './dialog-api-keys'
import { McpServerSelector } from './mcp-server-selector'
import { ModelSelector } from './model-selector'
import { useChat } from '../hooks/use-chat'

export function ChatInterface() {
  const {
    messages,
    isLoading,
    error,
    settings,
    setSettings,
    sendMessage,
    clearMessages,
    stopGeneration,
  } = useChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleApiKeysSaved = useCallback(() => {
    // Force refresh of the model selector by updating key
    setRefreshKey((prev) => prev + 1)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const hasSettings = settings.provider && settings.model && settings.apiKey
  const hasMessages = messages.length > 0

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Main Chat Container - Claude-like centered layout */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with Model Selection */}
        <div
          className="border-border/40 bg-background/95
            supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur"
        >
          <div className="container mx-auto max-w-4xl px-4 py-3">
            <div className="flex items-center justify-between">
              <ModelSelector
                key={refreshKey}
                settings={settings}
                onSettingsChange={setSettings}
                onOpenSettings={() => setIsSettingsOpen(true)}
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
            <div className="h-full overflow-y-auto">
              <div className="container mx-auto max-w-4xl px-4 py-6">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-4">
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
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md space-y-4 text-center">
                {settings.provider && settings.model ? (
                  <>
                    <div className="text-foreground text-4xl font-light">
                      How can I help you today?
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-foreground text-2xl font-light">
                      Welcome to Chat Playground
                    </div>
                    <p className="text-muted-foreground">
                      Select an AI model to get started
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="border-border/40 bg-destructive/10 border-t">
            <div className="container mx-auto max-w-4xl px-4 py-3">
              <Alert variant="destructive" className="border-destructive/20">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div
          className="border-border/40 bg-background/95
            supports-[backdrop-filter]:bg-background/60 border-t backdrop-blur"
        >
          <div className="container mx-auto max-w-4xl px-4 py-4">
            {/* MCP Tools Selection */}
            {hasSettings && (
              <div className="mb-4">
                <McpServerSelector
                  enabledTools={settings.enabledTools || []}
                  onEnabledToolsChange={(tools) =>
                    setSettings({ ...settings, enabledTools: tools })
                  }
                />
              </div>
            )}

            {/* Chat Input */}
            <ChatInput
              onSendMessage={sendMessage}
              onStopGeneration={stopGeneration}
              isLoading={isLoading}
              disabled={!hasSettings}
            />
          </div>
        </div>
      </div>

      {/* API Keys Modal */}
      <DialogApiKeys
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onSaved={handleApiKeysSaved}
      />
    </div>
  )
}
