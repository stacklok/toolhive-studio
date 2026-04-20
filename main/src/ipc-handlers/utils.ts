import { ipcMain } from 'electron'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import { getHeaders } from '../headers'
import { getInstanceId, isOfficialReleaseBuild } from '../util'
import { getWorkloadAvailableTools } from '../utils/mcp-tools'

// Allowlists for fields that are later used to index into lookup tables or
// construct URLs/connections in `createTransport`. Keeping these explicit makes
// the IPC boundary reject unexpected values (including prototype keys like
// `__proto__` or `constructor`) before they reach the transport layer.
const VALID_TRANSPORT_TYPES = new Set(['stdio', 'streamable-http', 'sse'])
const VALID_PROXY_MODES = new Set(['sse', 'streamable-http'])
const MAX_TCP_PORT = 65535

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean'
}

function isOptionalEnum(
  value: unknown,
  allowed: ReadonlySet<string>
): value is string | undefined {
  return (
    value === undefined || (typeof value === 'string' && allowed.has(value))
  )
}

function isOptionalTcpPort(value: unknown): value is number | undefined {
  if (value === undefined) return true
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_TCP_PORT
  )
}

function isOptionalHttpUrl(value: unknown): value is string | undefined {
  if (value === undefined) return true
  if (typeof value !== 'string') return false
  // Empty string is tolerated: `createTransport` treats it as "no url" and
  // falls back to `http://localhost:<port>/mcp`.
  if (value === '') return true
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// Validates that an untrusted IPC payload matches the subset of `CoreWorkload`
// that `getWorkloadAvailableTools` / `createTransport` rely on. Only fields
// consumed by the downstream code are validated; fields like labels or
// created_at are ignored here because the consumer never reads them.
function isCoreWorkload(value: unknown): value is CoreWorkload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const workload = value as Record<string, unknown>

  if (!isOptionalString(workload.name)) return false
  if (!isOptionalHttpUrl(workload.url)) return false
  if (!isOptionalEnum(workload.transport_type, VALID_TRANSPORT_TYPES)) {
    return false
  }
  if (!isOptionalEnum(workload.proxy_mode, VALID_PROXY_MODES)) return false
  if (!isOptionalTcpPort(workload.port)) return false
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
