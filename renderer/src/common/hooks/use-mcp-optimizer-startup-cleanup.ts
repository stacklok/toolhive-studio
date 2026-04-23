import { useEffect, useRef } from 'react'
import { useCleanupMetaOptimizer } from './use-cleanup-meta-optimizer'
import log from 'electron-log/renderer'

const TOOLHIVE_READY_POLL_INTERVAL_MS = 500
const TOOLHIVE_READY_MAX_WAIT_MS = 60_000

/**
 * Hook to run MCP Optimizer cleanup once per app session on startup.
 *
 * This ensures that users who previously had the MCP Optimizer feature enabled
 * get their state cleaned up automatically even if they never disabled the
 * feature through the experimental toggle (e.g., if the feature was sunset).
 *
 * The cleanup runs only after ToolHive is confirmed to be running and the
 * __mcp-optimizer__ group still exists. It is guaranteed to run at most once
 * per session, but waits for the daemon to be ready rather than bailing out.
 */
export function useMcpOptimizerStartupCleanup() {
  const { cleanupMetaOptimizer } = useCleanupMetaOptimizer()
  const hasRunCleanup = useRef(false)
  const inFlight = useRef(false)

  useEffect(() => {
    const runCleanup = async () => {
      if (hasRunCleanup.current || inFlight.current) return
      inFlight.current = true

      try {
        const ready = await waitForToolhiveReady()
        if (!ready) {
          log.warn(
            'MCP Optimizer startup cleanup: ToolHive did not become ready in time, skipping'
          )
          return
        }

        hasRunCleanup.current = true
        await cleanupMetaOptimizer()
        log.info('MCP Optimizer startup cleanup completed')
      } catch (error) {
        log.error('Error during MCP Optimizer startup cleanup:', error)
      } finally {
        inFlight.current = false
      }
    }

    runCleanup()
  }, [cleanupMetaOptimizer])
}

async function waitForToolhiveReady(): Promise<boolean> {
  const deadline = Date.now() + TOOLHIVE_READY_MAX_WAIT_MS
  while (Date.now() < deadline) {
    try {
      const isRunning = await window.electronAPI.isToolhiveRunning()
      if (isRunning) return true
    } catch {
      // ignore and retry
    }
    await new Promise((resolve) =>
      setTimeout(resolve, TOOLHIVE_READY_POLL_INTERVAL_MS)
    )
  }
  return false
}
