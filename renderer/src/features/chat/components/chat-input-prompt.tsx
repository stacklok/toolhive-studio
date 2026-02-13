import { useState, useEffect, useRef } from 'react'
import type { ChatStatus, FileUIPart } from 'ai'
import log from 'electron-log/renderer'
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
import { trackEvent } from '@/common/lib/analytics'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { ModelSelector } from './model-selector'
import { McpServerSelector } from './mcp-server-selector'
import type { ChatSettings } from '../types'
import { toast } from 'sonner'
import { toastVariants } from '@/common/lib/toast'

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

interface ChatInputProps {
  status: ChatStatus
  settings: ChatSettings
  updateSettings: (settings: ChatSettings) => void
  onSendMessage: (message: {
    text: string
    files?: FileUIPart[]
  }) => Promise<void>
  onStopGeneration: () => void
  onSettingsOpen: (isOpen: boolean) => void
  handleProviderChange: (providerId: string) => void
  hasProviderAndModel: boolean
  hasMessages: boolean
}

function InputWithAttachments({
  text,
  setText,
  status,
  settings,
  updateSettings,
  onSettingsOpen,
  onStopGeneration,
  handleProviderChange,
  hasProviderAndModel,
  hasMessages,
}: Omit<ChatInputProps, 'onSendMessage'> & {
  text: string
  setText: (text: string) => void
}) {
  const attachments = usePromptInputAttachments()
  const prevTextRef = useRef(text)

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

  const handleSubmit = () => {
    trackEvent(`Playground: submit`, { 'playground.status': status })
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
          onChange={(e) => setText(e.target.value)}
          value={text}
          placeholder={getPlaceholder()}
        />
      </PromptInputBody>
      <PromptInputToolbar>
        <PromptInputTools>
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
              <ModelSelector
                settings={settings}
                onSettingsChange={updateSettings}
                onOpenSettings={handleOpenSettings}
                onProviderChange={handleProviderChange}
              />
              <McpServerSelector />
            </>
          )}
        </PromptInputTools>
        <PromptInputSubmit
          onClick={handleSubmit}
          disabled={!text && !hasMessages}
          status={status}
          variant="action"
        />
      </PromptInputToolbar>
    </>
  )
}

export function ChatInputPrompt({
  status,
  settings,
  updateSettings,
  onSendMessage,
  onStopGeneration,
  onSettingsOpen,
  handleProviderChange,
  hasProviderAndModel,
  hasMessages,
}: ChatInputProps) {
  const [text, setText] = useState<string>('')

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text)
    const hasAttachments = Boolean(message.files?.length)

    if (!(hasText || hasAttachments)) {
      return
    }

    try {
      onSendMessage({
        text: message.text || 'Sent with attachments',
        files: message.files,
      })
      // Only clear text after successful send
      setText('')
    } catch (error) {
      console.error('Failed to send message:', error)
      if (message.text) {
        setText(message.text)
      }
      // Don't clear on error so user can retry
    }
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
        text={text}
        setText={setText}
      />
    </PromptInput>
  )
}
