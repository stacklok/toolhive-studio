import { useContext } from 'react'
import { PromptContext, type PromptContextType } from '@/common/contexts/prompt'

export function usePrompt() {
  const context = useContext(
    PromptContext as React.Context<PromptContextType | null>
  )
  if (!context) {
    throw new Error('usePrompt must be used within a PromptProvider')
  }
  return context.prompt
}
