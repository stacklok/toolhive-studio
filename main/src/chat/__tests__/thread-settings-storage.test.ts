import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReadThread = vi.hoisted(() => vi.fn())
const mockReadThreadSelectedModel = vi.hoisted(() => vi.fn())
const mockReadThreadEnabledMcpTools = vi.hoisted(() => vi.fn())
const mockReadThreadEnabledSkills = vi.hoisted(() => vi.fn())

const mockWriteThread = vi.hoisted(() => vi.fn())
const mockWriteThreadSelectedModel = vi.hoisted(() => vi.fn())
const mockWriteThreadEnabledMcpTools = vi.hoisted(() => vi.fn())
const mockWriteThreadEnabledSkills = vi.hoisted(() => vi.fn())

vi.mock('../../db/readers/threads-reader', () => ({
  readThread: mockReadThread,
  readThreadSelectedModel: mockReadThreadSelectedModel,
  readThreadEnabledMcpTools: mockReadThreadEnabledMcpTools,
  readThreadEnabledSkills: mockReadThreadEnabledSkills,
}))

vi.mock('../../db/writers/threads-writer', () => ({
  writeThread: mockWriteThread,
  writeThreadSelectedModel: mockWriteThreadSelectedModel,
  writeThreadEnabledMcpTools: mockWriteThreadEnabledMcpTools,
  writeThreadEnabledSkills: mockWriteThreadEnabledSkills,
}))

vi.mock('../../logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  getThreadSelectedModel,
  setThreadSelectedModel,
  getThreadEnabledMcpTools,
  setThreadEnabledMcpTools,
  getThreadEnabledSkills,
  setThreadEnabledSkill,
} from '../thread-settings-storage'

beforeEach(() => {
  vi.clearAllMocks()
  mockReadThread.mockReturnValue({
    id: 'thread-1',
    messages: [],
    lastEditTimestamp: 0,
    createdAt: 0,
  })
})

describe('getThreadSelectedModel', () => {
  it('returns the per-thread row when it has both fields', () => {
    mockReadThreadSelectedModel.mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o',
    })
    expect(getThreadSelectedModel('thread-1')).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
    })
  })

  it('returns null when the per-thread row has no model set', () => {
    mockReadThreadSelectedModel.mockReturnValue(null)
    expect(getThreadSelectedModel('thread-1')).toBeNull()
  })

  it('returns null and logs when the reader throws', () => {
    mockReadThreadSelectedModel.mockImplementation(() => {
      throw new Error('boom')
    })
    expect(getThreadSelectedModel('thread-1')).toBeNull()
  })
})

describe('setThreadSelectedModel', () => {
  it('writes the model to the per-thread row and reports success', () => {
    const result = setThreadSelectedModel('thread-1', 'openai', 'gpt-4o')
    expect(result).toEqual({ success: true })
    expect(mockWriteThreadSelectedModel).toHaveBeenCalledWith(
      'thread-1',
      'openai',
      'gpt-4o'
    )
  })

  it('materialises a draft thread row before writing the model', () => {
    mockReadThread.mockReturnValueOnce(null)
    setThreadSelectedModel('thread-draft', 'openai', 'gpt-4o')
    // writeThread is called first to materialise the row, then the model
    // is written.
    expect(mockWriteThread).toHaveBeenCalledTimes(1)
    expect(mockWriteThread.mock.calls[0]?.[0]?.id).toBe('thread-draft')
    expect(mockWriteThreadSelectedModel).toHaveBeenCalledWith(
      'thread-draft',
      'openai',
      'gpt-4o'
    )
  })

  it('stores NULL when provider or model is an empty string', () => {
    setThreadSelectedModel('thread-1', '', '')
    expect(mockWriteThreadSelectedModel).toHaveBeenCalledWith(
      'thread-1',
      null,
      null
    )
  })

  it('returns a failure result when row materialisation throws', () => {
    mockReadThread.mockReturnValueOnce(null)
    mockWriteThread.mockImplementationOnce(() => {
      throw new Error('disk full')
    })
    const result = setThreadSelectedModel('thread-draft', 'openai', 'gpt-4o')
    expect(result.success).toBe(false)
    expect(result.error).toContain('disk full')
    expect(mockWriteThreadSelectedModel).not.toHaveBeenCalled()
  })

  it('returns a failure result when the model writer throws', () => {
    mockWriteThreadSelectedModel.mockImplementationOnce(() => {
      throw new Error('locked')
    })
    const result = setThreadSelectedModel('thread-1', 'openai', 'gpt-4o')
    expect(result.success).toBe(false)
    expect(result.error).toContain('locked')
  })
})

describe('getThreadEnabledMcpTools', () => {
  it('returns the per-thread record', () => {
    mockReadThreadEnabledMcpTools.mockReturnValue({ alpha: ['t1', 't2'] })
    expect(getThreadEnabledMcpTools('thread-1')).toEqual({
      alpha: ['t1', 't2'],
    })
  })

  it('returns an empty object when the reader throws', () => {
    mockReadThreadEnabledMcpTools.mockImplementation(() => {
      throw new Error('boom')
    })
    expect(getThreadEnabledMcpTools('thread-1')).toEqual({})
  })
})

describe('setThreadEnabledMcpTools', () => {
  it('merges the new server entry into the existing per-thread map', () => {
    mockReadThreadEnabledMcpTools.mockReturnValue({
      alpha: ['t1'],
      beta: ['z1'],
    })
    const result = setThreadEnabledMcpTools('thread-1', 'beta', ['z2', 'z3'])
    expect(result).toEqual({ success: true })
    expect(mockWriteThreadEnabledMcpTools).toHaveBeenCalledWith('thread-1', {
      alpha: ['t1'],
      beta: ['z2', 'z3'],
    })
  })

  it('seeds a new server entry when the per-thread map is empty', () => {
    mockReadThreadEnabledMcpTools.mockReturnValue({})
    setThreadEnabledMcpTools('thread-1', 'alpha', ['t1'])
    expect(mockWriteThreadEnabledMcpTools).toHaveBeenCalledWith('thread-1', {
      alpha: ['t1'],
    })
  })

  it('materialises a draft thread row before merging the tools map', () => {
    mockReadThread.mockReturnValueOnce(null)
    mockReadThreadEnabledMcpTools.mockReturnValue({})
    setThreadEnabledMcpTools('thread-draft', 'alpha', ['t1'])
    expect(mockWriteThread).toHaveBeenCalledTimes(1)
    expect(mockWriteThread.mock.calls[0]?.[0]?.id).toBe('thread-draft')
  })
})

describe('getThreadEnabledSkills', () => {
  it('returns the per-thread skill list', () => {
    mockReadThreadEnabledSkills.mockReturnValue(['s1', 's2'])
    expect(getThreadEnabledSkills('thread-1')).toEqual(['s1', 's2'])
  })

  it('returns an empty array when the reader throws', () => {
    mockReadThreadEnabledSkills.mockImplementation(() => {
      throw new Error('boom')
    })
    expect(getThreadEnabledSkills('thread-1')).toEqual([])
  })
})

describe('setThreadEnabledSkill', () => {
  it('adds a skill to the per-thread allow-list when enabling', () => {
    mockReadThreadEnabledSkills.mockReturnValue(['existing'])
    const result = setThreadEnabledSkill('thread-1', 'new-skill', true)
    expect(result).toEqual({ success: true })
    expect(mockWriteThreadEnabledSkills).toHaveBeenCalledWith('thread-1', [
      'existing',
      'new-skill',
    ])
  })

  it('removes a skill when disabling', () => {
    mockReadThreadEnabledSkills.mockReturnValue(['s1', 's2', 's3'])
    setThreadEnabledSkill('thread-1', 's2', false)
    expect(mockWriteThreadEnabledSkills).toHaveBeenCalledWith('thread-1', [
      's1',
      's3',
    ])
  })

  it('deduplicates when enabling an already-enabled skill', () => {
    mockReadThreadEnabledSkills.mockReturnValue(['s1'])
    setThreadEnabledSkill('thread-1', 's1', true)
    expect(mockWriteThreadEnabledSkills).toHaveBeenCalledWith('thread-1', [
      's1',
    ])
  })

  it('writes the list sorted to keep the storage shape stable', () => {
    mockReadThreadEnabledSkills.mockReturnValue(['zeta', 'alpha'])
    setThreadEnabledSkill('thread-1', 'mid', true)
    expect(mockWriteThreadEnabledSkills).toHaveBeenCalledWith('thread-1', [
      'alpha',
      'mid',
      'zeta',
    ])
  })

  it('refuses empty skill names with a failure result', () => {
    const result = setThreadEnabledSkill('thread-1', '   ', true)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/empty/i)
    expect(mockWriteThreadEnabledSkills).not.toHaveBeenCalled()
  })

  it('materialises a draft thread row before toggling', () => {
    mockReadThread.mockReturnValueOnce(null)
    mockReadThreadEnabledSkills.mockReturnValue([])
    setThreadEnabledSkill('thread-draft', 'skill-a', true)
    expect(mockWriteThread).toHaveBeenCalledTimes(1)
    expect(mockWriteThread.mock.calls[0]?.[0]?.id).toBe('thread-draft')
  })

  it('returns a failure result when row materialisation throws', () => {
    mockReadThread.mockReturnValueOnce(null)
    mockWriteThread.mockImplementationOnce(() => {
      throw new Error('disk full')
    })
    const result = setThreadEnabledSkill('thread-draft', 's1', true)
    expect(result.success).toBe(false)
    expect(result.error).toContain('disk full')
    expect(mockWriteThreadEnabledSkills).not.toHaveBeenCalled()
  })
})
