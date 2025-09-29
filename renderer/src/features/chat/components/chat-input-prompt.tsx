import { useState, useEffect, useRef } from 'react'
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
import type { ChatStatus, FileUIPart } from 'ai'
import { ModelSelector } from './model-selector'
import { McpServerSelector } from './mcp-server-selector'
import type { ChatSettings } from '../types'

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
  handleProviderChange,
  hasProviderAndModel,
  hasMessages,
}: Omit<ChatInputProps, 'onSendMessage' | 'onStopGeneration'> & {
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
    if (settings.model) {
      const modelName = settings.model.includes('claude')
        ? 'Claude'
        : settings.model.includes('gpt')
          ? 'ChatGPT'
          : settings.model.includes('gemini')
            ? 'Gemini'
            : settings.model.includes('grok')
              ? 'Grok'
              : 'AI'
      return `Message ${modelName}...`
    }
    return 'Type your message...'
  }

  return (
    <>
      <PromptInputBody>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
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
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          {hasProviderAndModel && (
            <>
              <ModelSelector
                settings={settings}
                onSettingsChange={updateSettings}
                onOpenSettings={() => onSettingsOpen(true)}
                onProviderChange={handleProviderChange}
              />
              <McpServerSelector />
            </>
          )}
        </PromptInputTools>
        <PromptInputSubmit disabled={!text && !hasMessages} status={status} />
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
      accept="image/*,.pdf,.txt,.md,.json,.xml,.yaml,.yml,.csv,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.html,.css,.scss,.less,.sql,.sh,.bat,.docx,.doc,.rtf"
      onError={console.error}
      onAbort={onStopGeneration}
      onSubmit={handleSubmit}
      globalDrop
      multiple
      syncHiddenInput
    >
      <InputWithAttachments
        status={status}
        settings={settings}
        updateSettings={updateSettings}
        onSettingsOpen={onSettingsOpen}
        handleProviderChange={handleProviderChange}
        hasProviderAndModel={hasProviderAndModel}
        hasMessages={hasMessages}
        text={text}
        setText={setText}
      />
    </PromptInput>
  )
}
