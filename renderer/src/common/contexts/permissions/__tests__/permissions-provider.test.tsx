import { render, screen } from '@testing-library/react'
import { useContext } from 'react'
import { PermissionsContext } from '..'
import { PermissionsProvider } from '../permissions-provider'

type TestPermissions = Record<string, boolean>

function FeatureGuard({ permissionKey }: { permissionKey: string }) {
  const permissions = useContext(PermissionsContext) as TestPermissions
  if (permissions[permissionKey] === false) return null
  return <span data-testid={permissionKey}>Visible</span>
}

describe('PermissionsProvider', () => {
  it('allows all features by default', () => {
    render(
      <PermissionsProvider>
        <FeatureGuard permissionKey="local-mcp-run" />
        <FeatureGuard permissionKey="playground" />
      </PermissionsProvider>
    )

    expect(screen.getByTestId('local-mcp-run')).toBeInTheDocument()
    expect(screen.getByTestId('playground')).toBeInTheDocument()
  })

  it('hides a feature when overridden to false', () => {
    render(
      <PermissionsProvider value={{ 'local-mcp-run': false } as never}>
        <FeatureGuard permissionKey="local-mcp-run" />
      </PermissionsProvider>
    )

    expect(screen.queryByTestId('local-mcp-run')).not.toBeInTheDocument()
  })

  it('overrides only specified keys while keeping the rest enabled', () => {
    const overrides = { 'local-mcp-run': false, playground: true }

    render(
      <PermissionsProvider value={overrides as never}>
        <FeatureGuard permissionKey="local-mcp-run" />
        <FeatureGuard permissionKey="playground" />
        <FeatureGuard permissionKey="settings" />
      </PermissionsProvider>
    )

    expect(screen.queryByTestId('local-mcp-run')).not.toBeInTheDocument()
    expect(screen.getByTestId('playground')).toBeInTheDocument()
    expect(screen.getByTestId('settings')).toBeInTheDocument()
  })
})
