import { ipcMain } from 'electron'
import { getHeaders } from '../headers'
import { getInstanceId, isOfficialReleaseBuild } from '../util'
import { getWorkloadAvailableTools } from '../utils/mcp-tools'

interface Workload {
  name: string
  [key: string]: unknown
}

function isWorkload(value: unknown): value is Workload {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return true
}

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

  ipcMain.handle('utils:get-workload-available-tools', async (_, workload) => {
    if (!isWorkload(workload)) {
      throw new Error('Invalid workload parameter: expected an object with a name property')
    }
    return getWorkloadAvailableTools(workload)
  })
}
