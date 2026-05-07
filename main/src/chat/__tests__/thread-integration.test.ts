import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateThread = vi.hoisted(() => vi.fn())
const mockGetThread = vi.hoisted(() => vi.fn())
const mockSetActiveThreadId = vi.hoisted(() => vi.fn())

vi.mock('../threads-storage', () => ({
  createThread: mockCreateThread,
  getThread: mockGetThread,
  setActiveThreadId: mockSetActiveThreadId,
}))

import { ensureThreadExists } from '../thread-integration'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ensureThreadExists', () => {
  it('returns the existing thread id and sets it active when the row already exists', () => {
    mockGetThread.mockReturnValue({
      id: 'existing-thread',
      messages: [],
      lastEditTimestamp: 0,
      createdAt: 0,
    })

    const result = ensureThreadExists('existing-thread', 'Some title')

    expect(result).toEqual({
      success: true,
      threadId: 'existing-thread',
      isNew: false,
    })
    expect(mockSetActiveThreadId).toHaveBeenCalledWith('existing-thread')
    expect(mockCreateThread).not.toHaveBeenCalled()
  })

  it('promotes a draft id by creating the row with that exact id', () => {
    mockGetThread.mockReturnValue(null)
    mockCreateThread.mockReturnValue({
      success: true,
      threadId: 'draft-id',
    })

    const result = ensureThreadExists('draft-id')

    expect(result).toEqual({
      success: true,
      threadId: 'draft-id',
      isNew: true,
    })
    expect(mockCreateThread).toHaveBeenCalledWith(undefined, [], 'draft-id')
  })

  it('falls back to a generated id when none is provided', () => {
    mockGetThread.mockReturnValue(null)
    mockCreateThread.mockReturnValue({
      success: true,
      threadId: 'generated',
    })

    const result = ensureThreadExists(undefined, 'My title')

    expect(result).toEqual({
      success: true,
      threadId: 'generated',
      isNew: true,
    })
    expect(mockCreateThread).toHaveBeenCalledWith('My title', [], undefined)
  })

  it('surfaces createThread failures', () => {
    mockGetThread.mockReturnValue(null)
    mockCreateThread.mockReturnValue({
      success: false,
      error: 'disk full',
    })

    const result = ensureThreadExists('draft-id')

    expect(result).toEqual({ success: false, error: 'disk full' })
  })
})
