import { type ReactNode } from 'react'
import { PromptProvider } from '@/common/contexts/prompt/provider'

// This provider remains to keep the existing API surface.
// It now only ensures a PromptProvider is present so useConfirm
// (which composes usePrompt) can function even if no PromptProvider
// is set up by the caller.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  return <PromptProvider>{children}</PromptProvider>
}
