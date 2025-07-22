import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDownloadFile } from '../use-download-file'
import { toast } from 'sonner'

vi.mock('sonner', async () => {
  const original = await vi.importActual<typeof import('sonner')>('sonner')
  return {
    ...original,
    toast: {
      error: vi.fn(),
    },
  }
})

vi.mock('electron-log/renderer', () => ({
  default: {
    error: vi.fn(),
  },
}))

global.URL = {
  createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: vi.fn(),
} as unknown as typeof URL

global.Blob = vi.fn().mockImplementation((content, options) => ({
  content,
  options,
})) as unknown as typeof Blob

describe('useDownloadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('downloads file successfully', async () => {
    const { result } = renderHook(() => useDownloadFile())
    const mockGetContent = vi.fn().mockResolvedValue('file content')
    const filename = 'test-file.txt'

    await act(async () => {
      await result.current.downloadFile(mockGetContent, filename)
      vi.runAllTimers()
    })

    expect(mockGetContent).toHaveBeenCalled()
    expect(global.Blob).toHaveBeenCalledWith(['file content'], {
      type: 'text/plain',
    })
    expect(global.URL.createObjectURL).toHaveBeenCalled()
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(result.current.isDownloading).toBe(false)
  })

  it('handles download error gracefully', async () => {
    const { result } = renderHook(() => useDownloadFile())
    const mockGetContent = vi.fn().mockRejectedValue(new Error('Fetch failed'))
    const filename = 'test-file.txt'

    await act(async () => {
      await result.current.downloadFile(mockGetContent, filename)
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to save file')
    expect(result.current.isDownloading).toBe(false)
  })

  it('handles empty content error', async () => {
    const { result } = renderHook(() => useDownloadFile())
    const mockGetContent = vi.fn().mockResolvedValue('')
    const filename = 'test-file.txt'

    await act(async () => {
      await result.current.downloadFile(mockGetContent, filename)
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to save file')
    expect(result.current.isDownloading).toBe(false)
  })

  it('manages isDownloading state correctly', async () => {
    const { result } = renderHook(() => useDownloadFile())
    const mockGetContent = vi.fn().mockResolvedValue('file content')

    expect(result.current.isDownloading).toBe(false)

    await act(async () => {
      await result.current.downloadFile(mockGetContent, 'test.txt')
    })

    expect(result.current.isDownloading).toBe(false)
    expect(mockGetContent).toHaveBeenCalled()
  })
})
