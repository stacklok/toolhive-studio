import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Clients } from '../clients'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'
import type { V1ClientStatusResponse } from '@api/types.gen'

const router = createTestRouter(Clients)

describe('Clients Route', () => {
  it('should render the page', async () => {
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /clients/i })
      ).toBeInTheDocument()
    })

    expect(screen.getByText('VS Code - Copilot')).toBeInTheDocument()
    expect(screen.getByText('Cursor')).toBeInTheDocument()
    expect(screen.getByText('Claude Code')).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(5)
  })

  it.each([
    {
      name: 'no clients',
      mockResponse: { clients: [] } as V1ClientStatusResponse,
    },
    {
      name: 'clients present but not installed',
      mockResponse: {
        clients: [
          { client_type: 'foo', installed: false, registered: false },
          { client_type: 'bar', installed: false, registered: false },
        ],
      } as V1ClientStatusResponse,
    },
  ])(
    'shows empty state when there are no installed clients ($name)',
    async ({ mockResponse }) => {
      server.use(
        http.get(mswEndpoint('/api/v1beta/discovery/clients'), () => {
          return HttpResponse.json(mockResponse)
        })
      )

      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'No clients detected' })
        ).toBeInTheDocument()
      })

      expect(screen.getByText('No clients detected')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Clients are tools that can connect to ToolHive. If your client is not detected, consult the documentation.'
        )
      ).toBeInTheDocument()
    }
  )
})
