import type { QueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'

/**
 * Polls the main process (with retries) to confirm that the ToolHive backend
 * process is running and accepting connections.
 * Caches the result in the query client so subsequent navigations do not
 * re-poll. Throws if ToolHive never comes up after all retries.
 */
export async function ensureToolhiveRunning(
  queryClient: QueryClient
): Promise<void> {
  await queryClient.ensureQueryData({
    queryKey: ['is-toolhive-running'],
    queryFn: async () => {
      const res = await window.electronAPI.isToolhiveRunning()
      if (!res) {
        log.error('ToolHive is not running')
      }
      return res
    },
    retry: 5,
    retryDelay: 500,
    staleTime: 0,
  })
}
