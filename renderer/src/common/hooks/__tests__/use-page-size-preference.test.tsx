import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { usePageSizePreference } from '../use-page-size-preference'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('usePageSizePreference', () => {
  beforeEach(() => {
    window.electronAPI.uiPreferences.getPageSize = vi
      .fn()
      .mockResolvedValue(undefined)
    window.electronAPI.uiPreferences.setPageSize = vi
      .fn()
      .mockResolvedValue(undefined)
  })

  it('returns undefined while the initial read is in flight', () => {
    const { result } = renderHook(
      () => usePageSizePreference('ui.pageSize.skillsRegistry'),
      { wrapper: makeWrapper() }
    )

    expect(result.current.pageSize).toBeUndefined()
  })

  it('reads the persisted page size from the main process', async () => {
    window.electronAPI.uiPreferences.getPageSize = vi.fn().mockResolvedValue(50)

    const { result } = renderHook(
      () => usePageSizePreference('ui.pageSize.skillsRegistry'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => {
      expect(result.current.pageSize).toBe(50)
    })
    expect(window.electronAPI.uiPreferences.getPageSize).toHaveBeenCalledWith(
      'ui.pageSize.skillsRegistry'
    )
  })

  it('leaves pageSize undefined when nothing is persisted', async () => {
    const { result } = renderHook(
      () => usePageSizePreference('ui.pageSize.skillsRegistry'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.pageSize).toBeUndefined()
  })

  it('persists the new page size via IPC and updates state optimistically', async () => {
    const { result } = renderHook(
      () => usePageSizePreference('ui.pageSize.skillsRegistry'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setPageSize(24)
    })

    await waitFor(() => {
      expect(result.current.pageSize).toBe(24)
    })

    await waitFor(() => {
      expect(window.electronAPI.uiPreferences.setPageSize).toHaveBeenCalledWith(
        'ui.pageSize.skillsRegistry',
        24
      )
    })
  })
})
