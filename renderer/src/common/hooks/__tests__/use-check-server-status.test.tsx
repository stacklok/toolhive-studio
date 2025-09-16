import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCheckServerStatus } from '../use-check-server-status'
import * as polling from '../../lib/polling'
import { toast } from 'sonner'

type ToastLike = {
  success: (...args: unknown[]) => unknown
  loading: (...args: unknown[]) => unknown
  warning: (...args: unknown[]) => unknown
  dismiss: (...args: unknown[]) => unknown
}

vi.mock('sonner', async (importOriginal) => {
  const mod = (await importOriginal()) as { toast?: ToastLike } & Record<
    string,
    unknown
  >
  const mockedToast: ToastLike = {
    success: vi.fn(),
    loading: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  }
  return {
    ...mod,
    toast: {
      ...(mod.toast ?? ({} as ToastLike)),
      ...mockedToast,
    },
  }
})

describe('useCheckServerStatus', () => {
  const successSpy = vi.spyOn(toast, 'success')
  const loadingSpy = vi.spyOn(toast, 'loading')

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
    expect(loadingSpy).toHaveBeenCalled()

    // Success toast should contain an action with a Link to the correct group
    expect(successSpy).toHaveBeenCalled()
    const [, opts] = successSpy.mock.calls[0]!
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
