import { useEffect, type RefObject } from 'react'
import type { ChatComposerHandle } from '../components/chat-input-prompt'

/**
 * Registers an imperative handle on `composerHandleRef` so callers outside
 * this subtree (e.g. the message list's "Edit message" button) can pre-fill
 * the composer's text and focus the textarea without prop-drilling through
 * the entire tree.
 *
 * The handle is populated on mount and cleared on unmount — both the
 * empty-state and bottom composers share the same ref slot, so the parent
 * can tell whether a composer is currently mounted by checking
 * `composerHandleRef.current`.
 */
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
          // Some textarea types (e.g. <input type="number">) throw on
          // setSelectionRange. Plain text textareas never do — guard anyway
          // so a stray DOM shape can't break the edit flow.
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
