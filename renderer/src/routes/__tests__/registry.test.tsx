import { screen, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { MOCK_REGISTRY_RESPONSE } from '@/common/mocks/fixtures/registry'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'
import { Registry } from '../(registry)/registry'

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
    expect(
      screen.queryByText('atlassian'),
      'Expected atlassian to be in the document'
    ).toBeVisible()
  })

  expect(
    screen.queryByText('mongodb'),
    'Expected mongodb to be in the document'
  ).toBeVisible()
  expect(
    screen.queryByText('redis'),
    'Expected redis to be in the document'
  ).toBeVisible()

  // Filesystem was temporarily hidden
  expect(
    screen.queryByText('filesystem'),
    'Expected filesystem to NOT be in the document'
  ).not.toBeInTheDocument()
})
