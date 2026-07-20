import '../runtime/__tests__/setup'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installChatTestRuntimeHooks } from '../runtime/test-runtime'

const mockWriteThread = vi.hoisted(() => vi.fn())
const mockWriteActiveThread = vi.hoisted(() => vi.fn())
const mockReadThread = vi.hoisted(() => vi.fn())

vi.mock('../../db/writers/threads-writer', () => ({
  writeThread: mockWriteThread,
  deleteThreadFromDb: vi.fn(),
  clearAllThreadsFromDb: vi.fn(),
  writeActiveThread: mockWriteActiveThread,
  writeThreadSelectedModel: vi.fn(),
  writeThreadEnabledMcpTools: vi.fn(),
  writeThreadEnabledSkills: vi.fn(),
}))

vi.mock('../../db/readers/threads-reader', () => ({
  readThread: mockReadThread,
  readAllThreads: vi.fn(() => []),
  readActiveThreadId: vi.fn(),
  readThreadCount: vi.fn(() => 0),
  readThreadSelectedModel: vi.fn(() => null),
  readThreadEnabledMcpTools: vi.fn(() => ({})),
  readThreadEnabledSkills: vi.fn(() => []),
}))

vi.mock('../../db/readers/agents-reader', () => ({
  readThreadAgentId: vi.fn(() => null),
  readAgent: vi.fn(),
  readAllAgents: vi.fn(() => []),
}))

vi.mock('../../logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  ensureThreadExists,
  getThreadMessagesForTransport,
} from '../thread-integration'
import { markChatRuntimeUnavailable } from '../runtime/health'
import { CHAT_UNAVAILABLE_USER_MESSAGE } from '../runtime/errors'

installChatTestRuntimeHooks()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getThreadMessagesForTransport', () => {
  it('rejects when the chat runtime is unavailable instead of returning []', async () => {
    mockReadThread.mockReturnValue({
      id: 'thread-1',
      messages: [{ id: 'm1', role: 'user', parts: [] }],
      lastEditTimestamp: 0,
      createdAt: 0,
    })

    markChatRuntimeUnavailable('runtime_not_ready')

    await expect(getThreadMessagesForTransport('thread-1')).rejects.toThrow(
      CHAT_UNAVAILABLE_USER_MESSAGE
    )
  })

  it('rejects on StorageError instead of soft-failing to []', async () => {
    mockReadThread.mockImplementation(() => {
      throw new Error('db locked')
    })

    await expect(getThreadMessagesForTransport('thread-1')).rejects.toThrow(
      'db locked'
    )
  })
})

describe('ensureThreadExists', () => {
  it('returns the existing thread id and sets it active when the row already exists', () => {
    mockReadThread.mockReturnValue({
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
    expect(mockWriteActiveThread).toHaveBeenCalledWith('existing-thread')
    expect(mockWriteThread).not.toHaveBeenCalled()
  })

  it('promotes a draft id by creating the row with that exact id', () => {
    mockReadThread.mockReturnValue(null)

    const result = ensureThreadExists('draft-id')

    expect(result).toEqual({
      success: true,
      threadId: 'draft-id',
      isNew: true,
    })
    expect(mockWriteThread).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'draft-id', messages: [] })
    )
    expect(mockWriteActiveThread).toHaveBeenCalledWith('draft-id')
  })

  it('falls back to a generated id when none is provided', () => {
    mockReadThread.mockReturnValue(null)

    const result = ensureThreadExists(undefined, 'My title')

    expect(result).toEqual({
      success: true,
      threadId: expect.stringMatching(/^thread_/),
      isNew: true,
    })
    expect(mockWriteThread).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My title', messages: [] })
    )
    expect(mockWriteActiveThread).toHaveBeenCalledWith(result.threadId)
  })

  it('surfaces createThread failures', () => {
    mockReadThread.mockReturnValue(null)
    mockWriteThread.mockImplementation(() => {
      throw new Error('disk full')
    })

    const result = ensureThreadExists('draft-id')

    expect(result).toEqual({ success: false, error: 'disk full' })
  })
})
