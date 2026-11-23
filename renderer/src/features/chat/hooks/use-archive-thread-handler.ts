import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { usePlaygroundThreads } from './use-playground-threads'

type ThreadsApi = ReturnType<typeof usePlaygroundThreads>

/**
 * Archive action shared by every playground route that renders the sidebar.
 * Archiving is reversible, so there's no confirm dialog — just an Undo
 * toast. When the open thread is archived we move to its neighbour, the
 * same way delete does.
 */
export function useArchiveThreadHandler({
  archiveThread,
  unarchiveThread,
  activeThreadId,
}: Pick<ThreadsApi, 'archiveThread' | 'unarchiveThread'> & {
  activeThreadId: string | null
}) {
  const navigate = useNavigate()

  return useCallback(
    async (threadId: string) => {
      const result = await archiveThread(threadId)
      if (!result.success) {
        toast.error('Failed to archive chat')
        return
      }
      toast('Chat archived', {
        action: {
          label: 'Undo',
          onClick: () => {
            void unarchiveThread(threadId).then((ok) => {
              if (!ok) toast.error('Failed to unarchive chat')
            })
          },
        },
      })
      if (threadId !== activeThreadId) return
      if (result.nextId) {
        void navigate({
          to: '/playground/chat/$threadId',
          params: { threadId: result.nextId },
        })
      } else {
        void navigate({ to: '/playground' })
      }
    },
    [archiveThread, unarchiveThread, activeThreadId, navigate]
  )
}
