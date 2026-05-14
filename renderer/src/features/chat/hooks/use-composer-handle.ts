import { useEffect, type RefObject } from 'react'
import type { ChatComposerHandle } from '../components/chat-input-prompt'

// Lets callers outside this subtree drive the composer (e.g. "Edit message").
// Ref is null when no composer is mounted.
export function useComposerHandle(
  composerHandleRef: RefObject<ChatComposerHandle | null> | undefined,
  setText: (text: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement | null>
): void {
  useEffect(() => {
    if (!composerHandleRef) return
    composerHandleRef.current = {
      setText,
      focusTextarea: () => {
        const el = textareaRef.current
        if (!el) return
        el.focus()
        const end = el.value.length
        try {
          el.setSelectionRange(end, end)
        } catch {
          // Non-text input types throw on setSelectionRange.
        }
      },
    }
    return () => {
      if (composerHandleRef.current) {
        composerHandleRef.current = null
      }
    }
  }, [composerHandleRef, setText, textareaRef])
}
