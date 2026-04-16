import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import log from 'electron-log/renderer'

function PlaygroundIndexRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function resolveThreadAndRedirect() {
      try {
        const [allThreads, activeId] = await Promise.all([
          window.electronAPI.chat.getAllThreads(),
          window.electronAPI.chat.getActiveThreadId(),
        ])

        if (cancelled) return

        const sorted = [...allThreads].sort(
          (a, b) => b.lastEditTimestamp - a.lastEditTimestamp
        )

        const activeThread = activeId
          ? sorted.find((t) => t.id === activeId)
          : undefined

        const target = activeThread ?? sorted[0]

        if (target) {
          void navigate({
            to: '/playground/chat/$threadId',
            params: { threadId: target.id },
            replace: true,
          })
          return
        }

        const result = await window.electronAPI.chat.createChatThread()
        if (cancelled) return

        if (result.success && result.threadId) {
          void navigate({
            to: '/playground/chat/$threadId',
            params: { threadId: result.threadId },
            replace: true,
          })
          return
        }

        log.error(
          '[PlaygroundIndexRedirect] Failed to create initial thread:',
          result.error
        )
      } catch (err) {
        log.error('[PlaygroundIndexRedirect] Failed to resolve thread:', err)
      }
    }

    void resolveThreadAndRedirect()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return null
}

export const Route = createFileRoute('/playground/')({
  component: PlaygroundIndexRedirect,
})
