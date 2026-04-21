import { useState, useCallback } from 'react'
import { Button } from '@/common/components/ui/button'
import {
  MessageSquare,
  Plus,
  MessageCircleMore,
  ChevronDown,
} from 'lucide-react'
import { ChatMessage } from './chat-message'
import { DialogProviderSettings } from './dialog-provider-settings'
import { ErrorAlert } from './error-alert'
import { useChatStreaming } from '../hooks/use-chat-streaming'
import {
  useAutoScroll,
  CHAT_SCROLL_RESTORATION_ID,
} from '../hooks/use-auto-scroll'
import { useMcpAppMetadata } from '../hooks/use-mcp-app-metadata'
import { ChatInputPrompt } from './chat-input-prompt'
import { Separator } from '@/common/components/ui/separator'
import { ThreadTitleBar } from './thread-title-bar'
import { hasCredentials } from '../lib/utils'

interface ChatInterfaceProps {
  threadId?: string | null
  threadTitle?: string
  threadStarred?: boolean
  onRenameThread?: (title: string) => void
  onToggleStar?: () => void
  onDeleteThread?: () => void
}

export function ChatInterface({
  threadId,
  threadTitle,
  threadStarred,
  onRenameThread,
  onToggleStar,
  onDeleteThread,
}: ChatInterfaceProps = {}) {
  const {
    status,
    messages,
    isLoading,
    error,
    settings,
    updateSettings,
    sendMessage,
    cancelRequest,
    loadPersistedSettings,
  } = useChatStreaming(threadId)

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const toolUiMetadata = useMcpAppMetadata()

  const isStreaming = status === 'streaming' || status === 'submitted'

  const { containerRef, showScrollToBottom, scrollToBottom } = useAutoScroll({
    threadId,
    isStreaming,
    hasContent: messages.length > 0,
  })

  const handleProviderChange = useCallback(
    (providerId: string) => {
      loadPersistedSettings(providerId)
    },
    [loadPersistedSettings]
  )

  const hasProviderAndModel =
    !!settings.provider && !!settings.model && hasCredentials(settings)
  const hasMessages = messages.length > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {threadId && (
        <ThreadTitleBar
          title={threadTitle}
          starred={threadStarred}
          onRename={onRenameThread}
          onToggleStar={onToggleStar}
          onDelete={onDeleteThread}
        />
      )}
      {hasMessages && <Separator />}
      <div className="bg-background flex min-h-0 flex-1 flex-col px-4">
        {/* Messages Area */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* Scroll container — always in DOM so containerRef is never null.
              `data-scroll-restoration-id` registers this nested scrollable
              area with TanStack Router's scroll restoration. `overflowAnchor`
              keeps async content (MCP iframes, images, code blocks) from
              jolting the viewport when their height changes. */}
          <div
            ref={containerRef}
            data-scroll-restoration-id={CHAT_SCROLL_RESTORATION_ID}
            style={{ overflowAnchor: 'auto' }}
            className="h-full w-full overflow-y-auto scroll-smooth
              [view-transition-name:chat-messages-view]
              motion-safe:transition-all motion-safe:duration-300"
          >
            {hasMessages && (
              <div className="space-y-6 pt-8 pr-2 pb-24">
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
                    <ChatMessage
                      status={status}
                      message={message}
                      toolUiMetadata={toolUiMetadata}
                    />
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
              </div>
            )}
          </div>

          {/* Empty state overlay */}
          {!hasMessages && (
            <div
              className="absolute inset-0 flex items-center justify-center px-6
                [view-transition-name:chat-empty-state]
                motion-safe:transition-all motion-safe:duration-300"
            >
              <div className="w-full max-w-4xl space-y-8 text-center">
                <div className="mb-6 flex flex-col items-center">
                  <div className="text-foreground text-page-title text-center">
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
                        variant="action"
                        onClick={() => setIsSettingsOpen(true)}
                        className="mt-6 rounded-full"
                      >
                        <Plus /> Configure your providers
                      </Button>
                    </>
                  )}
                </div>

                {/* Chat Input integrated with main content */}
                {hasProviderAndModel && (
                  <div className="mx-auto max-w-2xl space-y-4">
                    <ChatInputPrompt
                      key={threadId ?? 'no-thread'}
                      onSendMessage={sendMessage}
                      onStopGeneration={cancelRequest}
                      onSettingsOpen={setIsSettingsOpen}
                      status={status}
                      settings={settings}
                      updateSettings={updateSettings}
                      handleProviderChange={handleProviderChange}
                      hasProviderAndModel={hasProviderAndModel}
                      hasMessages={hasMessages}
                      threadId={threadId}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scroll-to-bottom button — simple guard, hook manages state correctly */}
          {showScrollToBottom && (
            <Button
              size="sm"
              variant="secondary"
              className="animate-in fade-in-0 slide-in-from-bottom-2 absolute
                bottom-0 left-1/2 z-50 h-10 w-10 cursor-pointer rounded-full p-0
                duration-200"
              onClick={() => scrollToBottom()}
              aria-label="Scroll to bottom"
              title="Scroll to bottom"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ErrorAlert error={error} />

        {/* Chat Input when there are messages */}
        {hasMessages && (
          <div
            className="bg-background before:to-background relative mx-auto
              w-full px-6 pt-4 pb-2 before:pointer-events-none before:absolute
              before:inset-x-0 before:-top-12 before:h-12 before:bg-linear-to-b
              before:from-transparent before:content-['']"
          >
            <ChatInputPrompt
              key={threadId ?? 'no-thread'}
              onSendMessage={sendMessage}
              onStopGeneration={cancelRequest}
              onSettingsOpen={setIsSettingsOpen}
              status={status}
              settings={settings}
              updateSettings={updateSettings}
              handleProviderChange={handleProviderChange}
              hasProviderAndModel={hasProviderAndModel}
              hasMessages={hasMessages}
              threadId={threadId}
            />
          </div>
        )}

        {/* Provider Settings Modal */}
        <DialogProviderSettings
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />
      </div>
    </div>
  )
}
