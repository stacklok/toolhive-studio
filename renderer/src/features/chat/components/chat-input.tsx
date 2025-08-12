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
}

export function ChatInput({
  onSendMessage,
  onStopGeneration,
  isLoading,
  disabled,
  placeholder = 'Type your message...',
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

  return (
    <div className="relative">
      <div
        className="border-border bg-background flex items-center gap-2
          rounded-lg border p-3"
      >
        <div className="flex-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled ? 'Select an AI model to get started' : placeholder
            }
            disabled={disabled}
            className="placeholder:text-muted-foreground border-0 bg-transparent
              text-base focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {isLoading ? (
          <Button
            onClick={handleStop}
            variant="ghost"
            size="sm"
            className="hover:bg-muted h-8 w-8 p-0"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            variant="ghost"
            size="sm"
            className="hover:bg-muted h-8 w-8 p-0 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Helper text */}
      <div className="text-muted-foreground mt-2 text-center text-xs">
        {disabled
          ? 'Configure AI settings to start chatting'
          : 'Press Enter to send'}
      </div>
    </div>
  )
}
