import { stopToolhive } from '../toolhive-manager'
import { stopOwnedProxy } from '../chat/providers/thv-llm'
import log from '../logger'

export function register() {
  process.on('exit', (code) => {
    // eslint-disable-next-line no-restricted-syntax -- TODO: decide on branding in logs
    log.info(`[process exit] code=${code}, ensuring ToolHive is stopped...`)
    stopOwnedProxy()
    // Note: Only synchronous operations work here, so we force immediate SIGKILL
    stopToolhive({ force: true })
  })
}
