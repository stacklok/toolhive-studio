import { useEffect, useRef, type RefObject } from 'react'
import type { ChatStatus, FileUIPart } from 'ai'
import log from 'electron-log/renderer'
import { RefreshCw, SendHorizontal, X } from 'lucide-react'
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from '@/common/components/ai-elements/prompt-input'
import { Button } from '@/common/components/ui/button'
import { trackEvent } from '@/common/lib/analytics'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { ModelSelector } from './model-selector'
import { McpServerSelector } from './mcp-server-selector'
import { SkillSelector } from './skill-selector'
import { AgentSelector } from './agent-selector'
import type { ChatSettings } from '../types'
import { toast } from 'sonner'
import { toastVariants } from '@/common/lib/toast'
import { useThreadDraft } from '../hooks/use-thread-draft'
import { useComposerHandle } from '../hooks/use-composer-handle'
import { QueuedMessageChip } from './queued-message-chip'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '@utils/feature-flags'

const errorToastConfig = {
  max_files: {
    id: 'error_max_files',
    title: 'You reached the maximum number of files',
    description: 'You can only upload up to 5 files',
  },
  max_file_size: {
    id: 'error_max_file_size',
    title: 'File size too large',
    description: 'The file size must be less than 10MB',
  },
  accept: {
    id: 'error_accept',
    title: 'File type not supported',
    description: 'Only images and PDFs are supported',
  },
} as const

/**
 * Imperative handle the composer exposes to its parent so siblings (e.g.
 * message rows wanting to "Edit & resend") can drive the draft state and
 * focus the textarea without prop-drilling through the entire tree.
 *
 * Populated on mount, cleared on unmount. Callers should null-check before
 * use — both empty and bottom composers register the same ref slot, but
 * neither is mounted in the "no thread selected" empty-state.
 */
export interface ChatComposerHandle {
  setText: (text: string) => void
  focusTextarea: () => void
}

interface ChatInputProps {
  status: ChatStatus
  settings: ChatSettings
  updateSettings: (settings: ChatSettings) => void
  onSendMessage: (message: {
    text: string
    files?: FileUIPart[]
  }) => Promise<void>
  /**
   * Cancel the active stream, drop the partial assistant response, drop the
   * original user message being edited, and send the new text as a fresh
   * message. Only invoked when `editingMessageId === lastUserMessageId` and
   * the assistant is currently streaming.
   */
  onRewindAndResend?: (args: {
    text: string
    files?: FileUIPart[]
    editingMessageId: string
  }) => Promise<void>
  onStopGeneration: () => void
  onSettingsOpen: (isOpen: boolean) => void
  handleProviderChange: (providerId: string) => void
  hasProviderAndModel: boolean
  hasMessages: boolean
  threadId?: string | null
  /**
   * Optional ref the composer populates with imperative controls on mount.
   * Used by parents to power features that need to drive the composer from
   * outside the React subtree (e.g. clicking Edit on a past user message).
   */
  composerHandleRef?: RefObject<ChatComposerHandle | null>
  /** Id of the user message currently being edited, or `null` when idle. */
  editingMessageId?: string | null
  /** Id of the most recent user message in the thread, or `null` if none. */
  lastUserMessageId?: string | null
  /** Exit edit mode (called from the chip's cancel button and on auto-clear). */
  onClearEdit?: () => void
  /** Mutually exclusive with `isEditingStreaming` — the rewind chip wins. */
  queuedMessage?: { text: string; files?: FileUIPart[] } | null
  onCancelQueuedMessage?: () => void
}

function InputWithAttachments({
  text,
  setText,
  textareaRef,
  status,
  settings,
  updateSettings,
  onSettingsOpen,
  onStopGeneration,
  handleProviderChange,
  hasProviderAndModel,
  hasMessages,
  threadId,
  isEditingStreaming,
  onCancelEdit,
  queuedMessage,
  onCancelQueuedMessage,
}: Omit<
  ChatInputProps,
  | 'onSendMessage'
  | 'onRewindAndResend'
  | 'composerHandleRef'
  | 'editingMessageId'
  | 'lastUserMessageId'
  | 'onClearEdit'
> & {
  text: string
  setText: (text: string) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  isEditingStreaming: boolean
  onCancelEdit: () => void
}) {
  const attachments = usePromptInputAttachments()
  const prevTextRef = useRef(text)
  const isAgentsEnabled = useFeatureFlag(featureFlagKeys.AGENTS)

  // Clear attachments when text is cleared and message is ready
  useEffect(() => {
    if (
      prevTextRef.current &&
      !text &&
      attachments.files.length > 0 &&
      status === 'submitted'
    ) {
      attachments.clear()
    }
    prevTextRef.current = text
  })

  const getPlaceholder = () => {
    if (!hasProviderAndModel) return 'Select an AI model to get started'
    return 'Type your message...'
  }

  const handleOpenSettings = () => {
    trackEvent(`Playground: open manage api settings`)
    onSettingsOpen(true)
  }

  // Streaming + text + not editing: form's onSubmit queues via
  // `validatedSendMessage`. Skip the stop side-effect below.
  const isStreamingStatus = status === 'streaming' || status === 'submitted'
  const isQueueableSubmit =
    !isEditingStreaming && isStreamingStatus && Boolean(text)

  const handleSubmit = () => {
    trackEvent(`Playground: submit`, { 'playground.status': status })
    // Rewind / queue paths: form's onSubmit handles the action — don't stop.
    if (isEditingStreaming) return
    if (isQueueableSubmit) return
    const isStoppable = ['streaming', 'error', 'submitted'].includes(status)
    if (isStoppable) {
      onStopGeneration()
    }
    // if there is an error, clear the attachments
    if (status === 'error') {
      attachments.clear()
    }
  }

  return (
    <>
      {isEditingStreaming && (
        <div
          data-testid="edit-streaming-chip"
          className="bg-card text-muted-foreground flex items-center
            justify-between gap-2 rounded-md border px-3 py-1.5 text-xs"
        >
          <span>Editing last message — submit to rewind and retry</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Cancel edit"
            onClick={onCancelEdit}
            className="text-muted-foreground hover:text-foreground -mr-2 h-6
              gap-1 px-2 text-xs"
          >
            <X className="size-3" />
            cancel
          </Button>
        </div>
      )}
      {/* Hidden while editing — rewind chip wins. */}
      {!isEditingStreaming && queuedMessage && onCancelQueuedMessage && (
        <QueuedMessageChip
          queuedMessage={queuedMessage}
          onCancel={onCancelQueuedMessage}
        />
      )}
      <PromptInputBody>
        <PromptInputAttachments>
          {(attachment) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <PromptInputAttachment data={attachment} />
              </TooltipTrigger>
              <TooltipContent>{attachment.filename}</TooltipContent>
            </Tooltip>
          )}
        </PromptInputAttachments>
        <PromptInputTextarea
          ref={textareaRef}
          onChange={(e) => setText(e.target.value)}
          value={text}
          placeholder={getPlaceholder()}
        />
      </PromptInputBody>
      <PromptInputToolbar>
        <PromptInputTools className="min-w-0 flex-nowrap gap-1">
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger
              className="bg-secondary text-secondary-foreground rounded-full"
            />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments label="Add images or PDFs" />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          {hasProviderAndModel && (
            <>
              {isAgentsEnabled && <AgentSelector threadId={threadId} />}
              <ModelSelector
                settings={settings}
                onSettingsChange={updateSettings}
                onOpenSettings={handleOpenSettings}
                onProviderChange={handleProviderChange}
              />
              <McpServerSelector threadId={threadId} />
              <SkillSelector threadId={threadId} />
            </>
          )}
        </PromptInputTools>
        {isEditingStreaming ? (
          // Override the stop-square icon — this submit is a resend.
          <PromptInputSubmit
            onClick={handleSubmit}
            disabled={!text && !hasMessages}
            status={status}
            variant="action"
            aria-label="Resend edited message"
          >
            <RefreshCw className="size-4" />
          </PromptInputSubmit>
        ) : isQueueableSubmit ? (
          // Override the stop-square icon — this submit queues.
          <Tooltip>
            <TooltipTrigger asChild>
              <PromptInputSubmit
                onClick={handleSubmit}
                disabled={!text && !hasMessages}
                status={status}
                variant="action"
                aria-label="Queue message"
              >
                <SendHorizontal className="size-4" />
              </PromptInputSubmit>
            </TooltipTrigger>
            <TooltipContent>
              Queue message — sends when the current response finishes
            </TooltipContent>
          </Tooltip>
        ) : (
          <PromptInputSubmit
            onClick={handleSubmit}
            disabled={!text && !hasMessages}
            status={status}
            variant="action"
          />
        )}
      </PromptInputToolbar>
    </>
  )
}

export function ChatInputPrompt({
  status,
  settings,
  updateSettings,
  onSendMessage,
  onRewindAndResend,
  onStopGeneration,
  onSettingsOpen,
  handleProviderChange,
  hasProviderAndModel,
  hasMessages,
  threadId,
  composerHandleRef,
  editingMessageId,
  lastUserMessageId,
  onClearEdit,
  queuedMessage,
  onCancelQueuedMessage,
}: ChatInputProps) {
  const [text, setText] = useThreadDraft(threadId)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const isEditingStreaming =
    !!editingMessageId &&
    !!onRewindAndResend &&
    editingMessageId === lastUserMessageId &&
    (status === 'streaming' || status === 'submitted')

  // Auto-clear edit mode when the user empties the composer (they cleared
  // the prefilled text manually). Keeping the edit context attached to an
  // empty draft would let a blank "resend" sneak through.
  useEffect(() => {
    if (editingMessageId && text === '') {
      onClearEdit?.()
    }
  }, [text, editingMessageId, onClearEdit])

  useComposerHandle(composerHandleRef, setText, textareaRef)

  const handleCancelEdit = () => {
    onClearEdit?.()
    setText('')
  }

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text)
    const hasAttachments = Boolean(message.files?.length)

    if (!(hasText || hasAttachments)) {
      return
    }

    const submitText = message.text || 'Sent with attachments'

    if (isEditingStreaming && onRewindAndResend && editingMessageId) {
      // Rewind & retry path: cancel the active stream, drop the partial
      // assistant + original user message, and send the edited text as a
      // fresh message. We optimistically clear the composer; if the rewind
      // throws we restore the text so the user can retry.
      setText('')
      onClearEdit?.()
      Promise.resolve(
        onRewindAndResend({
          text: submitText,
          files: message.files,
          editingMessageId,
        })
      ).catch((error) => {
        log.error('Failed to rewind and resend:', error)
        if (message.text) {
          setText(message.text)
        }
      })
      return
    }

    // Optimistically clear edit mode + composer text; restore the text if
    // the send rejects. `onSendMessage` returns a Promise, so a synchronous
    // try/catch wouldn't catch async rejections — mirror the rewind path's
    // `.catch()` pattern.
    setText('')
    onClearEdit?.()
    Promise.resolve(
      onSendMessage({
        text: submitText,
        files: message.files,
      })
    ).catch((error) => {
      log.error('Failed to send message:', error)
      if (message.text) {
        setText(message.text)
      }
    })
  }

  return (
    <PromptInput
      className="bg-card"
      accept="image/*,application/pdf,.pdf"
      onError={(er) => {
        if (!('code' in er)) {
          log.error('PromptInput onError: unknown error', er)
          return
        }

        const config = errorToastConfig[er.code]
        if (config) {
          toast.error(config.title, {
            id: config.id,
            description: config.description,
            duration: 5000,
            ...toastVariants.destructive,
          })
        }
      }}
      onAbort={onStopGeneration}
      onSubmit={handleSubmit}
      maxFiles={5}
      globalDrop
      multiple
      syncHiddenInput
    >
      <InputWithAttachments
        status={status}
        settings={settings}
        updateSettings={updateSettings}
        onSettingsOpen={onSettingsOpen}
        onStopGeneration={onStopGeneration}
        handleProviderChange={handleProviderChange}
        hasProviderAndModel={hasProviderAndModel}
        hasMessages={hasMessages}
        threadId={threadId}
        text={text}
        setText={setText}
        textareaRef={textareaRef}
        isEditingStreaming={isEditingStreaming}
        onCancelEdit={handleCancelEdit}
        queuedMessage={queuedMessage}
        onCancelQueuedMessage={onCancelQueuedMessage}
      />
    </PromptInput>
  )
}
