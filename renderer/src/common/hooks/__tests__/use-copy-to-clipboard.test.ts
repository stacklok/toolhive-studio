import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCopyToClipboard } from '../use-copy-to-clipboard'

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

const writeText = vi.fn()
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  writable: true,
  configurable: true,
})

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    writeText.mockResolvedValue(undefined)
  })

  it('writes text to the clipboard and shows the default success toast', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('hi')
    })

    expect(writeText).toHaveBeenCalledWith('hi')
    expect(mockToastSuccess).toHaveBeenCalledWith('Copied to clipboard')
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('shows the default error toast when clipboard write fails', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'))
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('hi')
    })

    expect(mockToastError).toHaveBeenCalledWith('Failed to copy to clipboard')
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })

  it('uses a custom success message when provided', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('payload', {
        successMessage: 'Copied skill name to clipboard',
      })
    })

    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Copied skill name to clipboard'
    )
  })

  it('uses a custom error message when provided', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'))
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('payload', {
        errorMessage: 'Failed to copy skill name',
      })
    })

    expect(mockToastError).toHaveBeenCalledWith('Failed to copy skill name')
  })
})
