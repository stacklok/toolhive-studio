import { client } from '@common/api/generated/client.gen'
import log from 'electron-log/renderer'

export async function configureClient() {
  try {
    const port = await window.electronAPI.getToolhivePort()
    const telemetryHeaders = await window.electronAPI.getTelemetryHeaders()
    const baseUrl = `http://localhost:${port}`

    client.setConfig({
      baseUrl,
      headers: telemetryHeaders,
    })
  } catch (e) {
    log.error('Failed to get ToolHive port from main process: ', e)
    throw e
  }
}
