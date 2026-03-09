import {
  getTearingDownState,
  setTearingDownState,
  setQuittingState,
} from '../app-state'
import { getToolhivePort, stopToolhive, binPath } from '../toolhive-manager'
import { stopAllServers } from '../graceful-exit'
import { safeTrayDestroy } from '../system-tray'
import log from '../logger'

export function register() {
  ;['SIGTERM', 'SIGINT'].forEach((sig) =>
    process.on(sig, async () => {
      log.info(`[${sig}] start...`)
      if (getTearingDownState()) return
      setTearingDownState(true)
      setQuittingState(true)
      log.info(`[${sig}] delaying exit for teardown...`)
      try {
        const port = getToolhivePort()
        if (port) {
          await stopAllServers(binPath, port)
        }
      } finally {
        stopToolhive()
        safeTrayDestroy()
        process.exit(0)
      }
    })
  )
}
