import { createContext, useCallback, useContext } from 'react'
import { PERMISSION_KEYS, type PermissionKey } from './permission-keys'

export type { PermissionKey } from './permission-keys'
export { PERMISSION_KEYS } from './permission-keys'

export type Permissions = Record<PermissionKey, boolean>

function buildDefaultPermissions(): Permissions {
  const entries = Object.values(PERMISSION_KEYS).map(
    (key) => [key, true] as const
  )
  return Object.fromEntries(entries) as Permissions
}

export const DEFAULT_PERMISSIONS: Permissions = buildDefaultPermissions()

export const PermissionsContext =
  createContext<Permissions>(DEFAULT_PERMISSIONS)

export function usePermissions() {
  const permissions = useContext(PermissionsContext)

  const canShow = useCallback(
    (key: PermissionKey) => permissions[key] ?? true,
    [permissions]
  )

  return { permissions, canShow }
}
