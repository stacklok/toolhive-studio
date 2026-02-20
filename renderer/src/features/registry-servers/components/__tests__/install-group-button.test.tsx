import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { InstallGroupButton } from '../install-group-button'
import type {
  RegistryGroup,
  RegistryImageMetadata,
} from '@common/api/generated/types.gen'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import { mockedGetApiV1BetaGroups } from '@/common/mocks/fixtures/groups/get'
import { mockedGetApiV1BetaWorkloads } from '@/common/mocks/fixtures/workloads/get'

const mockServer: RegistryImageMetadata = {
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
    last_updated: '2025-01-01T00:00:00Z',
  },
  repository_url: 'https://github.com/example/atlassian',
  tags: ['tools'],
}

const mockGroup: RegistryGroup = {
  name: 'dev-toolkit',
  description: 'Essential tools for development',
  servers: {
    atlassian: mockServer,
  },
  remote_servers: {},
}

describe('InstallGroupButton', () => {
  it('shows error when trying to install a group that already exists', async () => {
    mockedGetApiV1BetaGroups.override((data) => ({
      ...data,
      groups: [
        ...(data.groups ?? []),
        { name: 'dev-toolkit', registered_clients: [] },
      ],
    }))

    mockedGetApiV1BetaWorkloads.activateScenario('empty')

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
    mockedGetApiV1BetaWorkloads.override(() => ({
      workloads: [
        { name: 'atlassian', group: 'default', status: 'running' },
        { name: 'other-server', group: 'default', status: 'running' },
      ],
    }))

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
    mockedGetApiV1BetaWorkloads.override(() => ({
      workloads: [
        { name: 'fetch', group: 'my-existing-group', status: 'running' },
      ],
    }))

    const customGroup: RegistryGroup = {
      ...mockGroup,
      servers: {
        fetch: {
          ...mockServer,
          name: 'fetch',
          description: 'Fetch server',
        },
      },
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
