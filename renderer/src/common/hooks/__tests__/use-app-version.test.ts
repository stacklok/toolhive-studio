import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { useAppVersion } from '../use-app-version'

const mockGetAppVersion = vi.fn()
const mockIsOfficialReleaseBuild = vi.fn()
const mockGetCliStatus = vi.fn()

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

function mockCliStatus(cliVersion: string | null) {
  return {
    isManaged: true,
    cliPath: '/home/user/.toolhive/bin/thv',
    cliVersion,
    installMethod: 'symlink' as const,
    symlinkTarget: '/app/resources/bin/thv',
    isValid: true,
    lastValidated: new Date().toISOString(),
  }
}

describe('useAppVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    window.electronAPI.getAppVersion = mockGetAppVersion
    window.electronAPI.isOfficialReleaseBuild = mockIsOfficialReleaseBuild
    window.electronAPI.cliAlignment = {
      getStatus: mockGetCliStatus,
    } as unknown as typeof window.electronAPI.cliAlignment

    mockGetAppVersion.mockResolvedValue({
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      isNewVersionAvailable: false,
    })
    mockIsOfficialReleaseBuild.mockResolvedValue(true)
  })

  it('sources toolhiveVersion from the detected CLI version', async () => {
    mockGetCliStatus.mockResolvedValue(mockCliStatus('0.1.39'))

    const { result } = renderHook(() => useAppVersion(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.toolhiveVersion).toBe('0.1.39')
  })

  it('falls back to "Unknown" when the CLI version cannot be detected', async () => {
    mockGetCliStatus.mockResolvedValue(mockCliStatus(null))

    const { result } = renderHook(() => useAppVersion(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.toolhiveVersion).toBe('Unknown')
  })

  it('falls back to "Unknown" when the CLI status query fails', async () => {
    mockGetCliStatus.mockRejectedValue(new Error('IPC failure'))

    const { result } = renderHook(() => useAppVersion(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.toolhiveVersion).toBe('Unknown')
  })
})
