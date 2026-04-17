import { ipcMain } from 'electron'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import { getHeaders } from '../headers'
import { getInstanceId, isOfficialReleaseBuild } from '../util'
import { getWorkloadAvailableTools } from '../utils/mcp-tools'

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === 'number'
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean'
}

// Validates that an untrusted IPC payload matches the subset of `CoreWorkload`
// that `getWorkloadAvailableTools` relies on. We do not exhaustively validate
// every field on the generated type; we only enforce the shape required by the
// consumer so malformed or malicious payloads are rejected at the boundary.
function isCoreWorkload(value: unknown): value is CoreWorkload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const workload = value as Record<string, unknown>

  if (!isOptionalString(workload.name)) return false
  if (!isOptionalString(workload.url)) return false
  if (!isOptionalString(workload.transport_type)) return false
  if (!isOptionalString(workload.proxy_mode)) return false
  if (!isOptionalNumber(workload.port)) return false
  if (!isOptionalBoolean(workload.remote)) return false

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

  ipcMain.handle(
    'utils:get-workload-available-tools',
    async (_, workload: unknown) => {
      if (!isCoreWorkload(workload)) {
        throw new TypeError(
          'Invalid workload payload for utils:get-workload-available-tools'
        )
      }
      return getWorkloadAvailableTools(workload)
    }
  )
}
