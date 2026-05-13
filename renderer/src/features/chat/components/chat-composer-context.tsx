import { createContext, useContext, type ReactNode } from 'react'

export interface ChatComposerContextValue {
  /** Replace the composer's draft text with the given value. */
  setDraftText: (text: string) => void
  /**
   * Focus the composer textarea and move the caret to the end of the value.
   * Implementations should be safe to call when the textarea is unmounted.
   */
  focusComposer: () => void
  /**
   * Id of the user message the composer is currently in "edit mode" for.
   * Set by `beginEdit` and cleared automatically when the composer text
   * becomes empty, the thread switches, or a normal message is submitted.
   */
  editingMessageId: string | null
  /**
   * Enter edit mode for a user message: pre-fills the composer with `text`,
   * focuses the textarea, and records `messageId` so the submit button can
   * decide whether the next submit is a "rewind & retry" (when this id is
   * the last user message and the assistant is currently streaming).
   */
  beginEdit: (messageId: string, text: string) => void
  /** Exit edit mode without clearing the composer text. */
  clearEdit: () => void
}

const ChatComposerContext = createContext<ChatComposerContextValue | null>(null)

interface ChatComposerProviderProps {
  value: ChatComposerContextValue
  children: ReactNode
}

export function ChatComposerProvider({
  value,
  children,
}: ChatComposerProviderProps) {
  return (
    <ChatComposerContext.Provider value={value}>
      {children}
    </ChatComposerContext.Provider>
  )
}

/**
 * Access the composer controls from anywhere inside a `ChatComposerProvider`.
 * Returns `null` when rendered outside a provider so consumers can degrade
 * gracefully (e.g. hide the Edit affordance in read-only contexts) instead
 * of throwing.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useChatComposer(): ChatComposerContextValue | null {
  return useContext(ChatComposerContext)
}
