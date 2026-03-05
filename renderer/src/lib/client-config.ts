import { client } from '@common/api/generated/client.gen'
import { ipcFetch } from '../common/lib/ipc-fetch'
import log from 'electron-log/renderer'

export async function configureClient() {
  try {
    // All API requests are routed through the main process via IPC. The main
    // process forwards them to the thv server over a UNIX socket (or TCP
    // fallback). The baseUrl is a dummy used only for URL construction inside
    // the hey-api client; the ipcFetch adapter strips it and sends only the
    // path + query to the main process.
    const telemetryHeaders = await window.electronAPI.getTelemetryHeaders()

    client.setConfig({
      baseUrl: 'http://localhost',
      fetch: ipcFetch,
      headers: telemetryHeaders,
    })
  } catch (e) {
    log.error('Failed to configure ToolHive API client: ', e)
    throw e
  }
}
