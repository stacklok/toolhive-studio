import { useMemo, type ReactNode } from 'react'
import { PermissionsContext, DEFAULT_PERMISSIONS, type Permissions } from '.'

interface PermissionsProviderProps {
  children: ReactNode
  /** Partial overrides merged on top of DEFAULT_PERMISSIONS (all true). */
  value?: Partial<Permissions>
}

export function PermissionsProvider({
  children,
  value,
}: PermissionsProviderProps) {
  const permissionsValue = useMemo(
    () => (value ? { ...DEFAULT_PERMISSIONS, ...value } : DEFAULT_PERMISSIONS),
    [value]
  )

  return (
    <PermissionsContext.Provider value={permissionsValue}>
      {children}
    </PermissionsContext.Provider>
  )
}
