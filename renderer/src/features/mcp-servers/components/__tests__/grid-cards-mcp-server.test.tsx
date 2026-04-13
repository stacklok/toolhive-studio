import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { PERMISSION_KEYS } from '@/common/contexts/permissions/permission-keys'
import { GridCardsMcpServers } from '../grid-cards-mcp-server'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'

// "osv" matches the default registry fixture (image: ghcr.io/stacklok/osv-mcp/server)
// "my-custom-server" does NOT match any registry entry → custom server
const workloads: CoreWorkload[] = [
  {
    name: 'osv',
    package: 'ghcr.io/stacklok/osv-mcp/server:latest',
    url: 'http://127.0.0.1:41317/sse#osv',
    port: 41317,
    status: 'running',
    group: 'default',
  },
  {
    name: 'my-custom-server',
    package: 'ghcr.io/my-org/my-custom-image:latest',
    url: 'http://127.0.0.1:28135/sse#my-custom-server',
    port: 28135,
    status: 'running',
    group: 'default',
  },
]

function renderGrid(permissions?: Record<string, boolean>) {
  const router = createTestRouter(() => (
    <GridCardsMcpServers mcpServers={workloads} />
  ))
  return renderRoute(
    router,
    permissions ? { permissions: permissions as never } : undefined
  )
}

describe('GridCardsMcpServers', () => {
  describe('when non-registry-servers permission is true (default)', () => {
    it('shows all servers including custom ones', async () => {
      renderGrid()

      await waitFor(() => {
        expect(screen.getByText('osv')).toBeVisible()
        expect(screen.getByText('my-custom-server')).toBeVisible()
      })
    })
  })

  describe('when non-registry-servers permission is false', () => {
    it('hides non-registry servers and shows only registry servers', async () => {
      renderGrid({ [PERMISSION_KEYS.NON_REGISTRY_SERVERS]: false })

      await waitFor(() => {
        expect(screen.getByText('osv')).toBeVisible()
      })

      expect(screen.queryByText('my-custom-server')).not.toBeInTheDocument()
    })
  })
})
