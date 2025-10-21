import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/common/mocks/node'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { GroupSelectorForm } from '../group-selector-form'
import { META_MCP_SERVER_NAME } from '@/common/lib/constants'

describe('GroupSelectorForm', () => {
  const mockGroups = [
    { name: 'default', servers: ['server1', 'server2'] },
    { name: 'production', servers: ['server3'] },
    { name: 'development', servers: [] },
  ]

  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    // Default: mock meta-mcp workload not found (404)
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
        if (params.name === META_MCP_SERVER_NAME) {
          return HttpResponse.json(null, { status: 404 })
        }
        return HttpResponse.json(null, { status: 404 })
      })
    )
  })

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    )
  }

  it('renders all group options', async () => {
    renderWithClient(<GroupSelectorForm groups={mockGroups} />)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeInTheDocument()
      expect(screen.getByText('production')).toBeInTheDocument()
      expect(screen.getByText('development')).toBeInTheDocument()
    })
  })

  it('displays server names for each group', async () => {
    renderWithClient(<GroupSelectorForm groups={mockGroups} />)

    await waitFor(() => {
      expect(screen.getByText('server1, server2')).toBeInTheDocument()
      expect(screen.getByText('server3')).toBeInTheDocument()
      expect(screen.getByText('No servers')).toBeInTheDocument()
    })
  })

  it('renders the Apply Changes button', async () => {
    renderWithClient(<GroupSelectorForm groups={mockGroups} />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /apply changes/i })
      ).toBeInTheDocument()
    })
  })

  it('renders radio buttons for each group', async () => {
    renderWithClient(<GroupSelectorForm groups={mockGroups} />)

    await waitFor(() => {
      const radioButtons = screen.getAllByRole('radio')
      expect(radioButtons).toHaveLength(3)
    })
  })

  it('allows selecting a group', async () => {
    const user = userEvent.setup()

    renderWithClient(<GroupSelectorForm groups={mockGroups} />)

    await waitFor(() => {
      expect(
        screen.getByRole('radio', { name: /default/i })
      ).toBeInTheDocument()
    })

    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()

    await user.click(defaultRadio)
    expect(defaultRadio).toBeChecked()
  })

  it('handles empty groups array', async () => {
    renderWithClient(<GroupSelectorForm groups={[]} />)

    await waitFor(() => {
      const radioButtons = screen.queryAllByRole('radio')
      expect(radioButtons).toHaveLength(0)

      expect(
        screen.getByRole('button', { name: /apply changes/i })
      ).toBeInTheDocument()
    })
  })
})
