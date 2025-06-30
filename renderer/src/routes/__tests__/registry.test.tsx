import { screen, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { MOCK_REGISTRY_RESPONSE } from '@/common/mocks/fixtures/registry'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'
import { Registry } from '../registry'
import userEvent from '@testing-library/user-event'
import type { RegistryImageMetadata } from '@/common/api/generated'

const router = createTestRouter(Registry)
beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks()
})

it('renders list of MCP servers', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
      return HttpResponse.json({ servers: MOCK_REGISTRY_RESPONSE })
    })
  )

  renderRoute(router)
  await waitFor(() => {
    for (const mcpServer of MOCK_REGISTRY_RESPONSE) {
      expect(
        screen.queryByText(mcpServer.name),
        `Expected ${mcpServer.name} to be in the document`
      ).toBeVisible()
    }
  })
})

const REGISTRY_SERVER = {
  name: 'foo-bar-server',
  image: 'ghcr.io/foo/bar:latest',
  description: 'foo bar',
  transport: 'stdio',
  permissions: {},
  tools: ['tool-1'],
  env_vars: [
    {
      name: 'ENV_VAR',
      description: 'foo bar',
      required: false,
    },

    {
      name: 'SECRET',
      description: 'foo bar',
      secret: true,
    },
  ],
  args: [],
  metadata: {},
  repository_url: 'https://github.com/foo/bar',
  tags: ['foo', 'bar'],
} as const satisfies RegistryImageMetadata

it('launches dialog with form when clicking on server', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
      return HttpResponse.json({
        servers: [REGISTRY_SERVER],
      })
    })
  )

  renderRoute(router)
  await waitFor(() => {
    expect(
      screen.queryByText(REGISTRY_SERVER.name),
      `Expected ${REGISTRY_SERVER.name} to be in the document`
    ).toBeVisible()
  })

  await userEvent.click(screen.getByText(REGISTRY_SERVER.name))

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByText(`Configure ${REGISTRY_SERVER.name}`)).toBeVisible()
  })

  expect(
    screen.getByLabelText('Server Name', { selector: 'input' })
  ).toBeVisible()

  expect(screen.getByLabelText('Secrets', { selector: 'input' })).toBeVisible()
  expect(
    screen.getByLabelText('Environment variables', { selector: 'input' })
  ).toBeVisible()
})
