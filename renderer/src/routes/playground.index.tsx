import { createFileRoute, redirect } from '@tanstack/react-router'
import log from 'electron-log/renderer'
import { generateDraftThreadId } from '@/features/chat/lib/thread-id'

async function resolveInitialThreadId(): Promise<string | null> {
  const activeId = await window.electronAPI.chat.getActiveThreadId()
  if (activeId) {
    // Archived threads are never reopened automatically.
    const active = await window.electronAPI.chat.getThreadSummary(activeId)
    if (active && !active.archivedAt) return active.id
  }

  // Most recent unarchived thread, starred or not.
  const { threads } = await window.electronAPI.chat.listThreads({ limit: 1 })
  if (threads[0]) return threads[0].id

  // No persisted threads — generate a draft id locally instead of
  // writing an empty row to the DB. The thread is promoted to a real
  // SQLite row by `ensureThreadExists` when the user sends the first
  // message (see `use-chat-streaming.ts`).
  return generateDraftThreadId()
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
