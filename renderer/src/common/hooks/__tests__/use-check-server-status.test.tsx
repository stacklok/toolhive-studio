import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCheckServerStatus } from '../use-check-server-status'
import * as polling from '../../lib/polling'
import { toast } from 'sonner'

describe('useCheckServerStatus', () => {
  const success = vi.mocked(toast.success)
  const loading = vi.mocked(toast.loading)

  beforeEach(() => {
    vi.clearAllMocks()
    // Make polling immediately resolve to success
    vi.spyOn(polling, 'pollServerStatus').mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function TestHarness({
    serverName,
    groupName,
  }: {
    serverName: string
    groupName: string
  }) {
    const { checkServerStatus } = useCheckServerStatus()
    return (
      <button
        onClick={() =>
          checkServerStatus({ serverName, groupName, isEditing: false })
        }
      >
        Trigger
      </button>
    )
  }

  function renderWithClient(ui: React.ReactElement) {
    const client = new QueryClient({
      defaultOptions: { queries: { gcTime: 0, staleTime: 0 } },
    })
    return render(
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    )
  }

  it('renders View link to the correct group after successful start', async () => {
    renderWithClient(
      <TestHarness serverName="my-server" groupName="research" />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Trigger' }))

    // Loading toast shown first
    expect(loading).toHaveBeenCalled()

    // Success toast should contain an action with a Link to the correct group
    expect(success).toHaveBeenCalled()
    const [, opts] = success.mock.calls[0]!
    // Extract Link element from action (Button asChild > Link)
    const actionNode = (opts as { action?: unknown })?.action as
      | { props?: Record<string, unknown> }
      | undefined
    const linkEl =
      ((actionNode?.props?.children as { props?: Record<string, unknown> }) ??
        actionNode) ||
      undefined

    const to = (linkEl?.props as { to?: unknown })?.to
    expect(to).toBe('/group/$groupName')

    const params = (linkEl?.props as { params?: { groupName?: string } })
      ?.params
    expect(params?.groupName).toBe('research')

    const search = (
      linkEl?.props as {
        search?: { newServerName?: string }
      }
    )?.search
    expect(search?.newServerName).toBe('my-server')
  })
})
