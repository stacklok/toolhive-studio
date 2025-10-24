import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { OptimizerWarnings } from '../optimizer-warnings'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import React from 'react'

const createQueryClientWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  return { queryClient, Wrapper }
}

describe('OptimizerWarnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('renders the experimental feature warning', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: [],
            },
          ],
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    render(
      <Wrapper>
        <OptimizerWarnings />
      </Wrapper>
    )

    expect(screen.getByText('Experimental Feature')).toBeInTheDocument()
    expect(
      screen.getByText(
        'This is an experimental feature currently under development.'
      )
    ).toBeInTheDocument()
  })

  it('renders only one alert when clients are registered', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: ['vscode', 'cursor'],
            },
          ],
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    const { container } = render(
      <Wrapper>
        <OptimizerWarnings />
      </Wrapper>
    )

    await waitFor(() => {
      const alerts = container.querySelectorAll('[role="alert"]')
      expect(alerts).toHaveLength(1)
    })
  })

  it('renders no clients registered alert when optimizer group has no clients', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: [],
            },
          ],
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    render(
      <Wrapper>
        <OptimizerWarnings />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('No clients registered')).toBeInTheDocument()
    })
    expect(
      screen.getByText(
        'We recommend registering clients in the selected optimized group.'
      )
    ).toBeInTheDocument()
  })

  it('renders two alerts when no clients are registered', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            {
              name: MCP_OPTIMIZER_GROUP_NAME,
              registered_clients: [],
            },
          ],
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    const { container } = render(
      <Wrapper>
        <OptimizerWarnings />
      </Wrapper>
    )

    await waitFor(() => {
      const alerts = container.querySelectorAll('[role="alert"]')
      expect(alerts).toHaveLength(2)
    })
  })
})
