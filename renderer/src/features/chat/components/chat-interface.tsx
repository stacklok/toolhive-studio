import { useRef, useState, useCallback, useLayoutEffect } from 'react'
import { Button } from '@/common/components/ui/button'
import {
  MessageSquare,
  Plus,
  MessageCircleMore,
  ChevronDown,
  Trash2,
} from 'lucide-react'
import { ChatMessage } from './chat-message'
import { DialogApiKeys } from './dialog-api-keys'
import { ErrorAlert } from './error-alert'
import { useChatStreaming } from '../hooks/use-chat-streaming'
import { ChatInputPrompt } from './chat-input-prompt'
import { Separator } from '@/common/components/ui/separator'
import { useConfirm } from '@/common/hooks/use-confirm'
import { TitlePage } from '@/common/components/title-page'

export function ChatInterface() {
  const {
    status,
    messages,
    isLoading,
    error,
    settings,
    updateSettings,
    sendMessage,
    cancelRequest,
    isPersistentLoading,
    loadPersistedSettings,
    clearMessages,
  } = useChatStreaming()
  const confirm = useConfirm()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  const handleProviderChange = useCallback(
    (providerId: string) => {
      loadPersistedSettings(providerId)
    },
    [loadPersistedSettings]
  )

  const checkScrollPosition = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container || messages.length === 0) {
      setShowScrollToBottom(false)
      return
    }

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    console.log('distanceFromBottom', distanceFromBottom)
    const isAtBottom = distanceFromBottom === 0

    setShowScrollToBottom(!isAtBottom)
  }, [messages.length])

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Simple smooth scroll to bottom - only when messages change
  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    // Also check scroll position after messages change
    setTimeout(checkScrollPosition, 200)
  }, [messages.length, checkScrollPosition])

  // Add scroll listener
  useLayoutEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.addEventListener('scroll', checkScrollPosition)
    return () => container.removeEventListener('scroll', checkScrollPosition)
  }, [checkScrollPosition])

  const hasProviderAndModel =
    !!settings.provider && !!settings.model && !!settings.apiKey
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
    <>
      <TitlePage title="Playground">
        {hasMessages && (
          <Button
            onClick={onClearMessages}
            variant="outline"
            className="cursor-pointer"
          >
            Clear Chat
            <Trash2 />
          </Button>
        )}
      </TitlePage>
      <div className="h-[calc(100vh-10rem)]">
        <div className="bg-background flex h-full flex-col">
          {hasMessages && <Separator />}
          {/* Messages Area */}
          <div className="relative flex-1 overflow-hidden">
            {isPersistentLoading && (
              <div
                className="flex h-full items-center justify-center
                  [view-transition-name:chat-loading-state]
                  motion-safe:transition-all motion-safe:duration-300"
              >
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
            )}

            {!isPersistentLoading && hasMessages && (
              <div
                ref={messagesContainerRef}
                className="h-full w-full overflow-y-auto scroll-smooth
                  [view-transition-name:chat-messages-view]
                  motion-safe:transition-all motion-safe:duration-300"
              >
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
            )}

            {!isPersistentLoading && !hasMessages && (
              <div
                className="flex h-full items-center justify-center px-6
                  [view-transition-name:chat-empty-state]
                  motion-safe:transition-all motion-safe:duration-300"
              >
                <div className="w-full max-w-4xl space-y-8 text-center">
                  <div>
                    <div
                      className="text-foreground font-display text-center
                        text-4xl font-bold"
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
                        <p
                          className="text-muted-foreground mt-4 font-sans
                            text-base"
                        >
                          Configure an AI service provider to use to test the
                          responses from your MCP servers
                        </p>
                        <Button
                          variant="default"
                          onClick={() => setIsSettingsOpen(true)}
                          className="mt-6"
                        >
                          <Plus /> Configure your API Keys
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Chat Input integrated with main content */}
                  {hasProviderAndModel && (
                    <div className="mx-auto max-w-2xl space-y-4">
                      <ChatInputPrompt
                        onSendMessage={sendMessage}
                        onStopGeneration={cancelRequest}
                        onSettingsOpen={setIsSettingsOpen}
                        status={status}
                        settings={settings}
                        updateSettings={updateSettings}
                        handleProviderChange={handleProviderChange}
                        hasProviderAndModel={hasProviderAndModel}
                        hasMessages={hasMessages}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            {showScrollToBottom && (
              <Button
                size="sm"
                variant="secondary"
                className="animate-in fade-in-0 slide-in-from-bottom-2 absolute
                  bottom-0 left-1/2 z-50 h-10 w-10 cursor-pointer rounded-full
                  p-0 duration-200"
                onClick={scrollToBottom}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>

          <ErrorAlert error={error} />

          {/* Chat Input when there are messages */}
          {hasMessages && (
            <div className="mx-auto w-full pt-4 pb-2">
              <ChatInputPrompt
                onSendMessage={sendMessage}
                onStopGeneration={cancelRequest}
                onSettingsOpen={setIsSettingsOpen}
                status={status}
                settings={settings}
                updateSettings={updateSettings}
                handleProviderChange={handleProviderChange}
                hasProviderAndModel={hasProviderAndModel}
                hasMessages={hasMessages}
              />
            </div>
          )}

          {/* API Keys Modal */}
          <DialogApiKeys
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
          />
        </div>
      </div>
    </>
  )
}
