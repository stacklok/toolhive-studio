import { useCallback, useState } from 'react'

const STORAGE_PREFIX = 'toolhive.playground.draft.'

function storageKey(threadId: string): string {
  return `${STORAGE_PREFIX}${threadId}`
}

function readDraft(threadId: string | undefined): string {
  if (!threadId) return ''
  try {
    return localStorage.getItem(storageKey(threadId)) ?? ''
  } catch {
    return ''
  }
}

export function clearThreadDraft(threadId: string | undefined): void {
  if (!threadId) return
  try {
    localStorage.removeItem(storageKey(threadId))
  } catch {
    // ignore
  }
}

// Expects the consuming component to be keyed by `threadId`, so switching
// threads remounts and the lazy initializer re-reads the stored draft.
export function useThreadDraft(
  threadId: string | undefined
): readonly [string, (next: string) => void] {
  const [text, setText] = useState<string>(() => readDraft(threadId))

  const update = useCallback(
    (next: string) => {
      setText(next)
      if (!threadId) return
      try {
        if (next) {
          localStorage.setItem(storageKey(threadId), next)
        } else {
          localStorage.removeItem(storageKey(threadId))
        }
      } catch {
        // ignore quota/serialization errors
      }
    },
    [threadId]
  )

  return [text, update] as const
}
