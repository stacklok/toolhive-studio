import { useEffect, useState } from 'react'
import log from 'electron-log/renderer'

interface StreamStateEvent {
  chatId: string
  status: 'streaming' | 'finished' | 'error'
}

/**
 * Tracks which threads currently have an active main-process stream so
 * UI surfaces (e.g. the playground sidebar) can show a live indicator
 * regardless of whether the user is currently viewing that thread.
 *
 * The main process broadcasts `chat:stream:state` to every renderer
 * window when a stream starts, ends, or errors. On mount we also seed
 * the set with `chat.getStreamingThreadIds()` so streams already in
 * flight before this renderer mounted are reflected immediately.
 */
export function useStreamingThreads(): Set<string> {
  const [streamingIds, setStreamingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    window.electronAPI.chat
      .getStreamingThreadIds()
      .then((ids) => {
        if (cancelled || !Array.isArray(ids)) return
        setStreamingIds((prev) => {
          if (ids.length === prev.size && ids.every((id) => prev.has(id))) {
            return prev
          }
          return new Set(ids)
        })
      })
      .catch((err) =>
        log.error(
          '[useStreamingThreads] Failed to seed streaming thread ids:',
          err
        )
      )

    const listener = (...args: unknown[]) => {
      const event = args[0] as StreamStateEvent | undefined
      if (!event || !event.chatId) return
      setStreamingIds((prev) => {
        const next = new Set(prev)
        if (event.status === 'streaming') {
          next.add(event.chatId)
        } else {
          next.delete(event.chatId)
        }
        return next
      })
    }

    const unsubscribe = window.electronAPI.on?.('chat:stream:state', listener)
    return () => {
      cancelled = true
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      } else {
        window.electronAPI.removeListener?.('chat:stream:state', listener)
      }
    }
  }, [])

  return streamingIds
}
