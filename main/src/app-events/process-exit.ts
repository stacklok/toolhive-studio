import { stopToolhive } from '../toolhive-manager'
import log from '../logger'

export function register() {
  process.on('exit', (code) => {
    // eslint-disable-next-line no-restricted-syntax -- TODO: decide on branding in logs
    log.info(`[process exit] code=${code}, ensuring ToolHive is stopped...`)
    // Note: Only synchronous operations work here, so we force immediate SIGKILL
    stopToolhive({ force: true })
  })
}
