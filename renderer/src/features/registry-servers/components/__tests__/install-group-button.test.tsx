import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { InstallGroupButton } from '../install-group-button'
import type { RegistryGroup } from '@api/types.gen'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'

const mockGroup: RegistryGroup = {
  name: 'dev-toolkit',
  description: 'Essential tools for development',
  servers: {
    atlassian: {
      name: 'atlassian',
      image: 'ghcr.io/example/atlassian:latest',
      description: 'Connect to Atlassian services',
      tier: 'Community',
      status: 'Active',
      transport: 'stdio',
      permissions: {},
      tools: ['atlassian'],
      env_vars: [],
      args: [],
      metadata: {
        stars: 150,
        pulls: 1500,
        last_updated: '2025-01-01T00:00:00Z',
      },
      repository_url: 'https://github.com/example/atlassian',
      tags: ['tools'],
    },
  },
  remote_servers: {},
}

describe('InstallGroupButton', () => {
  it('shows error when trying to install a group that already exists', async () => {
    server.use(
      http.get('*/api/v1beta/groups', () => {
        return HttpResponse.json({
          groups: [
            {
              name: 'dev-toolkit',
              description: 'Existing group',
            },
            {
              name: 'other-group',
              description: 'Another group',
            },
          ],
        })
      }),
      http.get('*/api/v1beta/workloads', () => {
        return HttpResponse.json({
          workloads: [],
        })
      })
    )

    const router = createTestRouter(() => (
      <InstallGroupButton groupName="dev-toolkit" group={mockGroup} />
    ))
    renderRoute(router)

    await waitFor(() => {
      const installButton = screen.getByRole('button', {
        name: /install group/i,
      })
      expect(installButton).toBeDisabled()
    })

    expect(
      screen.getByText(/group.*dev-toolkit.*already exists/i)
    ).toBeInTheDocument()

    const deleteLink = screen.getByRole('link', { name: /delete it/i })
    expect(deleteLink).toBeInTheDocument()
    expect(deleteLink).toHaveAttribute('href', '/group/dev-toolkit')
  })

  it('shows error when trying to install a group with servers that conflict with existing servers', async () => {
    server.use(
      http.get('*/api/v1beta/groups', () => {
        return HttpResponse.json({
          groups: [],
        })
      }),
      http.get('*/api/v1beta/workloads', () => {
        return HttpResponse.json({
          workloads: [
            {
              name: 'atlassian',
              group: 'default',
              status: 'running',
            },
            {
              name: 'other-server',
              group: 'default',
              status: 'running',
            },
          ],
        })
      })
    )

    const router = createTestRouter(() => (
      <InstallGroupButton groupName="dev-toolkit" group={mockGroup} />
    ))
    renderRoute(router)

    await waitFor(() => {
      const installButton = screen.getByRole('button', {
        name: /install group/i,
      })
      expect(installButton).toBeDisabled()
    })

    expect(
      screen.getByText(/server.*"atlassian".*already exists/i)
    ).toBeInTheDocument()

    const deleteLink = screen.getByRole('link', { name: /delete it/i })
    expect(deleteLink).toBeInTheDocument()
    expect(deleteLink).toHaveAttribute('href', '/group/default')
  })

  it('shows error with link to specific group when server conflict exists in a named group', async () => {
    server.use(
      http.get('*/api/v1beta/groups', () => {
        return HttpResponse.json({
          groups: [],
        })
      }),
      http.get('*/api/v1beta/workloads', () => {
        return HttpResponse.json({
          workloads: [
            {
              name: 'fetch',
              group: 'my-existing-group',
              status: 'running',
            },
          ],
        })
      })
    )

    const customGroup: RegistryGroup = {
      name: 'dev-toolkit',
      description: 'Dev toolkit with fetch',
      servers: {
        fetch: {
          name: 'fetch',
          image: 'ghcr.io/example/fetch:latest',
          description: 'Fetch server',
          tier: 'Community',
          status: 'Active',
          transport: 'stdio',
          permissions: {},
          tools: ['fetch'],
          env_vars: [],
          args: [],
          metadata: {
            stars: 100,
            pulls: 1000,
            last_updated: '2025-01-01T00:00:00Z',
          },
          repository_url: 'https://github.com/example/fetch',
          tags: ['test'],
        },
      },
      remote_servers: {},
    }

    const router = createTestRouter(() => (
      <InstallGroupButton groupName="dev-toolkit" group={customGroup} />
    ))
    renderRoute(router)

    await waitFor(() => {
      const installButton = screen.getByRole('button', {
        name: /install group/i,
      })
      expect(installButton).toBeDisabled()
    })

    expect(
      screen.getByText(/server.*"fetch".*already exists/i)
    ).toBeInTheDocument()

    const deleteLink = screen.getByRole('link', { name: /delete it/i })
    expect(deleteLink).toBeInTheDocument()
    expect(deleteLink).toHaveAttribute('href', '/group/my-existing-group')
  })
})
