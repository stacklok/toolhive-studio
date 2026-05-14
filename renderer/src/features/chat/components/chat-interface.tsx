import { useState, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/common/components/ui/button'
import { Plus, MessageCircleMore, ChevronDown } from 'lucide-react'
import { ChatMessageList } from './chat-message-list'
import { DialogProviderSettings } from './dialog-provider-settings'
import { ErrorAlert } from './error-alert'
import { useChatStreaming } from '../hooks/use-chat-streaming'
import {
  useAutoScroll,
  CHAT_SCROLL_RESTORATION_ID,
} from '../hooks/use-auto-scroll'
import { useMcpAppMetadata } from '../hooks/use-mcp-app-metadata'
import { ChatInputPrompt, type ChatComposerHandle } from './chat-input-prompt'
import {
  ChatComposerProvider,
  type ChatComposerContextValue,
} from './chat-composer-context'
import { Separator } from '@/common/components/ui/separator'
import { ThreadTitleBar } from './thread-title-bar'
import { hasCredentials } from '../lib/utils'
import { getEmptyStateCopy } from '../lib/empty-state-copy'
import { useAgents, useThreadAgentId } from '../../agents/hooks/use-agents'
import { DEFAULT_AGENT_ID } from '@common/types/agents'

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
    rewindAndResend,
    lastUserMessageId,
    cancelRequest,
    loadPersistedSettings,
    queuedMessage,
    cancelQueuedMessage,
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

  // The currently-mounted `ChatInputPrompt` registers its imperative handle
  // here. Looking up `.current` at call time (rather than capturing a stale
  // closure) lets sibling message rows drive whichever composer is in the
  // tree right now (empty-state vs bottom).
  const composerHandleRef = useRef<ChatComposerHandle | null>(null)

  // Tracks which user message the composer is currently editing. Owned
  // here (not in `ChatInputPrompt`) so it survives the empty-state ⇄
  // bottom composer swap that happens when the first message lands.
  //
  // We pair the id with a snapshot of `threadId` so a thread switch
  // implicitly invalidates the edit context — see the comparison below.
  // This is the "adjust some state when a prop changes" pattern from the
  // React docs, expressed without `useEffect` so the lint rule
  // `react-hooks/set-state-in-effect` stays clean.
  const [editingState, setEditingState] = useState<{
    threadId: string | null | undefined
    messageId: string | null
  }>({ threadId, messageId: null })

  // If the prop changed since the last commit, throw away the stale
  // editing snapshot during render. Cheap — only fires on thread switch.
  const editingMessageId =
    editingState.threadId === threadId ? editingState.messageId : null
  if (editingState.threadId !== threadId && editingState.messageId !== null) {
    setEditingState({ threadId, messageId: null })
  }

  const beginEdit = useCallback(
    (messageId: string, text: string) => {
      setEditingState({ threadId, messageId })
      composerHandleRef.current?.setText(text)
      composerHandleRef.current?.focusTextarea()
    },
    [threadId]
  )

  const clearEdit = useCallback(() => {
    setEditingState((prev) =>
      prev.messageId === null ? prev : { ...prev, messageId: null }
    )
  }, [])

  const composerValue = useMemo<ChatComposerContextValue>(
    () => ({
      setDraftText: (text: string) => {
        composerHandleRef.current?.setText(text)
      },
      focusComposer: () => {
        composerHandleRef.current?.focusTextarea()
      },
      editingMessageId,
      beginEdit,
      clearEdit,
    }),
    [editingMessageId, beginEdit, clearEdit]
  )

  const { data: agents = [] } = useAgents()
  const { data: threadAgentId } = useThreadAgentId(threadId ?? undefined)
  const selectedAgentId = threadAgentId || DEFAULT_AGENT_ID
  const selectedAgent = agents.find((a) => a.id === selectedAgentId)
  const emptyStateCopy = getEmptyStateCopy(selectedAgent)

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
      <ChatComposerProvider value={composerValue}>
        <div className="bg-background flex min-h-0 flex-1 flex-col px-4">
          {/* Messages Area */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {/* Scroll container — always in DOM so containerRef is never null.
              `data-scroll-restoration-id` registers this nested scrollable
              area with TanStack Router's scroll restoration. Native scroll
              anchoring (`overflow-anchor: auto`, the CSS default) keeps
              async content (MCP iframes, images, code blocks) from jolting
              the viewport when their height changes. */}
            <div
              ref={containerRef}
              data-scroll-restoration-id={CHAT_SCROLL_RESTORATION_ID}
              className="h-full w-full overflow-y-auto scroll-smooth
                [view-transition-name:chat-messages-view]
                motion-safe:transition-all motion-safe:duration-300"
            >
              {hasMessages && (
                <ChatMessageList
                  messages={messages}
                  status={status}
                  isLoading={isLoading}
                  toolUiMetadata={toolUiMetadata}
                  scrollElementRef={containerRef}
                />
              )}
            </div>

            {/* Empty state overlay */}
            {!hasMessages && (
              <div
                className="absolute inset-0 flex items-center justify-center
                  px-6 [view-transition-name:chat-empty-state]
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
                      {emptyStateCopy.heading}
                    </div>
                    {!hasProviderAndModel && (
                      <>
                        <p
                          className="text-muted-foreground mt-4 font-sans
                            text-base"
                        >
                          {emptyStateCopy.subtext}
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
                        onRewindAndResend={rewindAndResend}
                        onStopGeneration={cancelRequest}
                        onSettingsOpen={setIsSettingsOpen}
                        status={status}
                        settings={settings}
                        updateSettings={updateSettings}
                        handleProviderChange={handleProviderChange}
                        hasProviderAndModel={hasProviderAndModel}
                        hasMessages={hasMessages}
                        threadId={threadId}
                        composerHandleRef={composerHandleRef}
                        editingMessageId={editingMessageId}
                        lastUserMessageId={lastUserMessageId}
                        onClearEdit={clearEdit}
                        queuedMessage={queuedMessage}
                        onCancelQueuedMessage={cancelQueuedMessage}
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
                  bottom-0 left-1/2 z-50 h-10 w-10 cursor-pointer rounded-full
                  p-0 duration-200"
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
                before:inset-x-0 before:-top-12 before:h-12
                before:bg-linear-to-b before:from-transparent
                before:content-['']"
            >
              <ChatInputPrompt
                key={threadId ?? 'no-thread'}
                onSendMessage={sendMessage}
                onRewindAndResend={rewindAndResend}
                onStopGeneration={cancelRequest}
                onSettingsOpen={setIsSettingsOpen}
                status={status}
                settings={settings}
                updateSettings={updateSettings}
                handleProviderChange={handleProviderChange}
                hasProviderAndModel={hasProviderAndModel}
                hasMessages={hasMessages}
                threadId={threadId}
                composerHandleRef={composerHandleRef}
                editingMessageId={editingMessageId}
                lastUserMessageId={lastUserMessageId}
                onClearEdit={clearEdit}
                queuedMessage={queuedMessage}
                onCancelQueuedMessage={cancelQueuedMessage}
              />
            </div>
          )}

          {/* Provider Settings Modal */}
          <DialogProviderSettings
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
          />
        </div>
      </ChatComposerProvider>
    </div>
  )
}
