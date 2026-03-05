import {
  getTearingDownState,
  setTearingDownState,
  setQuittingState,
} from '../app-state'
import { stopToolhive, binPath } from '../toolhive-manager'
import { stopAllServers } from '../graceful-exit'
import { createMainProcessFetch } from '../unix-socket-fetch'
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
        await stopAllServers(binPath, { createFetch: createMainProcessFetch })
      } finally {
        stopToolhive()
        safeTrayDestroy()
        process.exit(0)
      }
    })
  )
}
