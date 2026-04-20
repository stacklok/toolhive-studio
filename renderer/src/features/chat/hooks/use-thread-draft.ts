import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_PREFIX = 'toolhive.playground.draft.'

// Debounce window for persisting the composer text to localStorage. Keeps
// typing off the synchronous write path while being short enough that a
// trailing keystroke followed by a quick thread switch still flushes via
// the unmount cleanup below.
const WRITE_DEBOUNCE_MS = 200

function storageKey(threadId: string): string {
  return `${STORAGE_PREFIX}${threadId}`
}

function readDraft(threadId: string | null | undefined): string {
  if (!threadId) return ''
  try {
    return localStorage.getItem(storageKey(threadId)) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(threadId: string, value: string): void {
  try {
    if (value) {
      localStorage.setItem(storageKey(threadId), value)
    } else {
      localStorage.removeItem(storageKey(threadId))
    }
  } catch {
    // ignore quota/serialization errors
  }
}

export function clearThreadDraft(threadId: string | null | undefined): void {
  if (!threadId) return
  try {
    localStorage.removeItem(storageKey(threadId))
  } catch {
    // ignore
  }
}

// Expects the consuming component to be keyed by `threadId`, so switching
// threads remounts and the lazy initializer re-reads the stored draft.
//
// Writes are debounced (WRITE_DEBOUNCE_MS) to keep synchronous localStorage
// off the keypress path; any pending write is flushed on unmount so a thread
// switch or component teardown doesn't drop the trailing keystrokes.
export function useThreadDraft(
  threadId: string | null | undefined
): readonly [string, (next: string) => void] {
  const [text, setText] = useState<string>(() => readDraft(threadId))

  const latestRef = useRef(text)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!threadId) return
    writeDraft(threadId, latestRef.current)
  }, [threadId])

  useEffect(() => {
    return () => {
      flush()
    }
  }, [flush])

  const update = useCallback(
    (next: string) => {
      setText(next)
      latestRef.current = next
      if (!threadId) return
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(flush, WRITE_DEBOUNCE_MS)
    },
    [threadId, flush]
  )

  return [text, update] as const
}
