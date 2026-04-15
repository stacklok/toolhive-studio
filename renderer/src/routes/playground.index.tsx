import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/playground/')({
  beforeLoad: async () => {
    const [allThreads, activeId] = await Promise.all([
      window.electronAPI.chat.getAllThreads(),
      window.electronAPI.chat.getActiveThreadId(),
    ])

    const sorted = [...allThreads].sort(
      (a, b) => b.lastEditTimestamp - a.lastEditTimestamp
    )

    // Prefer the stored active thread if it still exists
    const activeThread = activeId
      ? sorted.find((t) => t.id === activeId)
      : undefined

    const target = activeThread ?? sorted[0]

    if (target) {
      throw redirect({
        to: '/playground/chat/$threadId',
        params: { threadId: target.id },
        replace: true,
      })
    }

    // No threads exist — create one first
    const result = await window.electronAPI.chat.createChatThread()
    if (result.success && result.threadId) {
      throw redirect({
        to: '/playground/chat/$threadId',
        params: { threadId: result.threadId },
        replace: true,
      })
    }
  },
  component: () => null,
})
