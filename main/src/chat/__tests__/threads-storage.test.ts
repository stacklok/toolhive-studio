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

vi.mock('electron-store', () => ({
  default: class FakeStore {},
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp'),
    on: vi.fn(),
    once: vi.fn(),
  },
  webContents: {
    getAllWebContents: vi.fn(() => []),
  },
}))

import { createThread } from '../threads-storage'

installChatTestRuntimeHooks()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createThread', () => {
  it('writes a row with a generated id when no explicit id is provided', () => {
    mockReadThread.mockReturnValue(null)

    const result = createThread('Hello')

    expect(result.success).toBe(true)
    expect(result.threadId).toMatch(/^thread_/)
    expect(mockWriteThread).toHaveBeenCalledTimes(1)
    expect(mockWriteActiveThread).toHaveBeenCalledWith(result.threadId)
    expect(mockReadThread).not.toHaveBeenCalled()
  })

  it('writes a row with the explicit id when the row does not exist', () => {
    mockReadThread.mockReturnValue(null)

    const result = createThread(undefined, [], 'thread_draft_42')

    expect(result).toEqual({ success: true, threadId: 'thread_draft_42' })
    expect(mockReadThread).toHaveBeenCalledWith('thread_draft_42')
    expect(mockWriteThread).toHaveBeenCalledTimes(1)
    const written = mockWriteThread.mock.calls[0]?.[0]
    expect(written.id).toBe('thread_draft_42')
  })

  it('refuses to overwrite an existing row when an explicit id collides', () => {
    mockReadThread.mockReturnValue({
      id: 'thread_draft_42',
      messages: [{ id: 'm1', role: 'user', parts: [] }],
      lastEditTimestamp: 0,
      createdAt: 0,
    })

    const result = createThread(undefined, [], 'thread_draft_42')

    expect(result.success).toBe(false)
    expect(result.error).toContain('thread_draft_42')
    expect(mockWriteThread).not.toHaveBeenCalled()
    expect(mockWriteActiveThread).not.toHaveBeenCalled()
  })
})
