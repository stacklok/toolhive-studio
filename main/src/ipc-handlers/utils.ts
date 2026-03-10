import { ipcMain } from 'electron'
import { getHeaders } from '../headers'
import { getInstanceId, isOfficialReleaseBuild } from '../util'
import { getWorkloadAvailableTools } from '../utils/mcp-tools'

export function register() {
  ipcMain.handle('telemetry-headers', () => {
    return getHeaders()
  })

  ipcMain.handle('is-official-release-build', () => {
    return isOfficialReleaseBuild()
  })

  ipcMain.handle('get-instance-id', async () => {
    const instanceId = await getInstanceId()
    return instanceId
  })

  ipcMain.handle('utils:get-workload-available-tools', async (_, workload) =>
    getWorkloadAvailableTools(workload)
  )
}
