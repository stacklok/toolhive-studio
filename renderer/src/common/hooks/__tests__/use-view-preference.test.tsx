import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useViewPreference } from '../use-view-preference'

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

describe('useViewPreference', () => {
  beforeEach(() => {
    window.electronAPI.uiPreferences.getViewMode = vi
      .fn()
      .mockResolvedValue('card')
    window.electronAPI.uiPreferences.setViewMode = vi
      .fn()
      .mockResolvedValue(undefined)
  })

  it('returns the default card view while the initial read is in flight', () => {
    const { result } = renderHook(
      () => useViewPreference('ui.viewMode.mcpServers'),
      { wrapper: makeWrapper() }
    )

    expect(result.current.view).toBe('card')
  })

  it('reads the persisted table view from the main process', async () => {
    window.electronAPI.uiPreferences.getViewMode = vi
      .fn()
      .mockResolvedValue('table')

    const { result } = renderHook(
      () => useViewPreference('ui.viewMode.skillsInstalled'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => {
      expect(result.current.view).toBe('table')
    })
    expect(window.electronAPI.uiPreferences.getViewMode).toHaveBeenCalledWith(
      'ui.viewMode.skillsInstalled'
    )
  })

  it('persists the new view via IPC and updates state optimistically', async () => {
    const { result } = renderHook(
      () => useViewPreference('ui.viewMode.mcpServers'),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => {
      expect(result.current.view).toBe('card')
    })

    act(() => {
      result.current.setView('table')
    })

    await waitFor(() => {
      expect(result.current.view).toBe('table')
    })

    await waitFor(() => {
      expect(window.electronAPI.uiPreferences.setViewMode).toHaveBeenCalledWith(
        'ui.viewMode.mcpServers',
        'table'
      )
    })
  })
})
