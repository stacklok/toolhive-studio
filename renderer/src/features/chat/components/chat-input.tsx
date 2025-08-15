import { useState, type KeyboardEvent } from 'react'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Send, Square } from 'lucide-react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onStopGeneration: () => void
  isLoading: boolean
  disabled: boolean
  placeholder?: string
  selectedModel?: string
}

export function ChatInput({
  onSendMessage,
  onStopGeneration,
  isLoading,
  disabled,
  placeholder = 'Type your message...',
  selectedModel,
}: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (input.trim() && !isLoading && !disabled) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStop = () => {
    onStopGeneration()
  }

  const getPlaceholder = () => {
    if (disabled) return 'Select an AI model to get started'
    if (selectedModel) {
      const modelName = selectedModel.includes('claude')
        ? 'Claude'
        : selectedModel.includes('gpt')
          ? 'ChatGPT'
          : selectedModel.includes('gemini')
            ? 'Gemini'
            : selectedModel.includes('grok')
              ? 'Grok'
              : 'AI'
      return `Message ${modelName}...`
    }
    return placeholder
  }

  return (
    <div className="relative">
      <div
        className="border-border bg-card relative rounded-2xl border shadow-sm"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={disabled}
          className="placeholder:text-muted-foreground min-h-[60px] resize-none
            border-0 bg-transparent px-4 py-4 pr-12 text-base
            focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        {isLoading ? (
          <Button
            onClick={handleStop}
            variant="ghost"
            size="sm"
            className="hover:bg-muted absolute right-3 bottom-3 h-8 w-8
              rounded-lg p-0"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            size="sm"
            className="absolute right-3 bottom-3 h-8 w-8 rounded-lg p-0
              disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Helper text */}
      <div className="text-muted-foreground mt-3 text-center text-xs">
        {disabled
          ? 'Select an AI model to start chatting'
          : 'Press Enter to send'}
      </div>
    </div>
  )
}
