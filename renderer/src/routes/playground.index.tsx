import { createFileRoute, redirect } from '@tanstack/react-router'
import log from 'electron-log/renderer'

async function resolveInitialThreadId(): Promise<string | null> {
  const [allThreads, activeId] = await Promise.all([
    window.electronAPI.chat.getAllThreads(),
    window.electronAPI.chat.getActiveThreadId(),
  ])

  const sorted = [...allThreads].sort(
    (a, b) => b.lastEditTimestamp - a.lastEditTimestamp
  )

  const activeThread = activeId
    ? sorted.find((t) => t.id === activeId)
    : undefined

  const target = activeThread ?? sorted[0]
  if (target) return target.id

  const result = await window.electronAPI.chat.createChatThread()
  if (result.success && result.threadId) return result.threadId

  log.error(
    '[PlaygroundIndexRedirect] Failed to create initial thread:',
    result.error
  )
  return null
}

export const Route = createFileRoute('/playground/')({
  // Resolve the target thread in the router itself so we never render a
  // blank page during the mount-then-redirect bounce.
  beforeLoad: async () => {
    let threadId: string | null
    try {
      threadId = await resolveInitialThreadId()
    } catch (err) {
      log.error('[PlaygroundIndexRedirect] Failed to resolve thread:', err)
      return
    }

    if (!threadId) return

    throw redirect({
      to: '/playground/chat/$threadId',
      params: { threadId },
      replace: true,
    })
  },
  component: () => null,
})
