import { screen, waitFor } from '@testing-library/react'
import { beforeEach, it, expect, vi } from 'vitest'
import { createTestRouter } from '@/common/test/create-test-router'
import { McpOptimizerRoute } from '../mcp-optimizer'
import { renderRoute } from '@/common/test/render-route'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'

const router = createTestRouter(McpOptimizerRoute, '/mcp-optimizer')

beforeEach(() => {
  vi.clearAllMocks()

  // Mock the groups API
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    // Mock the workloads API
    http.get(mswEndpoint('/api/v1beta/workloads'), () =>
      HttpResponse.json({
        workloads: [
          { name: 'server1', group: 'default' },
          { name: 'server2', group: 'default' },
          { name: 'server3', group: 'production' },
        ],
      })
    )
  )
})

it('renders the MCP Optimizer page title', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('heading', { name: /mcp optimizer/i })
    ).toBeInTheDocument()
  })
})

it('renders the Advanced dropdown menu button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /advanced/i })
    ).toBeInTheDocument()
  })
})

it('renders the Manage Clients button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /manage clients/i })
    ).toBeInTheDocument()
  })
})

it('renders the warnings section', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('Experimental Feature')).toBeInTheDocument()
  })

  expect(screen.getByText('Unoptimized Access Detected')).toBeInTheDocument()
})

it('renders the section header and description', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('Select Groups to Optimize')).toBeInTheDocument()
  })

  expect(
    screen.getByText(
      /Choose which server groups should be included in optimization/i
    )
  ).toBeInTheDocument()
})

it('renders the group selector form with groups', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getAllByText('default').length).toBeGreaterThan(0)
  })

  expect(screen.getAllByText('production').length).toBeGreaterThan(0)
})

it('renders the Apply Changes button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /apply changes/i })
    ).toBeInTheDocument()
  })
})

it('displays server names for each group', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('server1, server2')).toBeInTheDocument()
  })

  expect(screen.getByText('server3')).toBeInTheDocument()
})
