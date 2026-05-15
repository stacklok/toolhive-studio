import { describe, it, expect, vi, beforeEach } from 'vitest'

const ctx = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  return {
    handlers,
    getThreadSelectedModel: vi.fn<
      (threadId: string) => { provider: string; model: string } | null
    >(() => null),
    setThreadSelectedModel: vi.fn<
      (
        threadId: string,
        provider: string,
        model: string
      ) => { success: boolean; error?: string }
    >(() => ({ success: true })),
    getThreadEnabledMcpTools: vi.fn<
      (threadId: string) => Record<string, string[]>
    >(() => ({})),
    setThreadEnabledMcpTools: vi.fn<
      (
        threadId: string,
        serverName: string,
        toolNames: string[]
      ) => { success: boolean; error?: string }
    >(() => ({ success: true })),
    getThreadEnabledSkills: vi.fn<(threadId: string) => string[]>(() => []),
    setThreadEnabledSkill: vi.fn<
      (
        threadId: string,
        name: string,
        enabled: boolean
      ) => { success: boolean; error?: string }
    >(() => ({ success: true })),
  }
})

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      ctx.handlers.set(channel, handler)
    },
  },
}))

vi.mock('../../../chat/thread-settings-storage', () => ({
  getThreadSelectedModel: ctx.getThreadSelectedModel,
  setThreadSelectedModel: ctx.setThreadSelectedModel,
  getThreadEnabledMcpTools: ctx.getThreadEnabledMcpTools,
  setThreadEnabledMcpTools: ctx.setThreadEnabledMcpTools,
  getThreadEnabledSkills: ctx.getThreadEnabledSkills,
  setThreadEnabledSkill: ctx.setThreadEnabledSkill,
}))

import { register } from '../thread-settings'

describe('chat/thread-settings IPC handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ctx.handlers.clear()
    register()
  })

  describe('chat:thread-settings:get-selected-model', () => {
    it('forwards the threadId and returns the storage result', async () => {
      ctx.getThreadSelectedModel.mockReturnValue({
        provider: 'openai',
        model: 'gpt-4o',
      })

      const handler = ctx.handlers.get(
        'chat:thread-settings:get-selected-model'
      )!
      const result = await handler(null, 'thread-1')

      expect(ctx.getThreadSelectedModel).toHaveBeenCalledWith('thread-1')
      expect(result).toEqual({ provider: 'openai', model: 'gpt-4o' })
    })
  })

  describe('chat:thread-settings:set-selected-model', () => {
    it('forwards the model selection to thread storage', async () => {
      const handler = ctx.handlers.get(
        'chat:thread-settings:set-selected-model'
      )!
      const result = await handler(null, 'thread-1', 'openai', 'gpt-4o')

      expect(ctx.setThreadSelectedModel).toHaveBeenCalledWith(
        'thread-1',
        'openai',
        'gpt-4o'
      )
      expect(result).toEqual({ success: true })
    })

    it('returns the storage failure result verbatim', async () => {
      ctx.setThreadSelectedModel.mockReturnValue({
        success: false,
        error: 'disk full',
      })
      const handler = ctx.handlers.get(
        'chat:thread-settings:set-selected-model'
      )!
      const result = await handler(null, 'thread-1', 'openai', 'gpt-4o')
      expect(result).toEqual({ success: false, error: 'disk full' })
    })
  })

  describe('chat:thread-settings:get-enabled-mcp-tools', () => {
    it('returns the per-thread MCP tools record', async () => {
      ctx.getThreadEnabledMcpTools.mockReturnValue({ alpha: ['t1', 't2'] })

      const handler = ctx.handlers.get(
        'chat:thread-settings:get-enabled-mcp-tools'
      )!
      const result = await handler(null, 'thread-1')

      expect(ctx.getThreadEnabledMcpTools).toHaveBeenCalledWith('thread-1')
      expect(result).toEqual({ alpha: ['t1', 't2'] })
    })
  })

  describe('chat:thread-settings:set-enabled-mcp-tools', () => {
    it('forwards the server + tools payload to thread storage', async () => {
      const handler = ctx.handlers.get(
        'chat:thread-settings:set-enabled-mcp-tools'
      )!
      const result = await handler(null, 'thread-1', 'alpha', ['t1', 't2'])

      expect(ctx.setThreadEnabledMcpTools).toHaveBeenCalledWith(
        'thread-1',
        'alpha',
        ['t1', 't2']
      )
      expect(result).toEqual({ success: true })
    })
  })

  describe('chat:thread-settings:get-enabled-skills', () => {
    it('returns the per-thread enabled skill list', async () => {
      ctx.getThreadEnabledSkills.mockReturnValue(['s1', 's2'])

      const handler = ctx.handlers.get(
        'chat:thread-settings:get-enabled-skills'
      )!
      const result = await handler(null, 'thread-1')

      expect(ctx.getThreadEnabledSkills).toHaveBeenCalledWith('thread-1')
      expect(result).toEqual(['s1', 's2'])
    })
  })

  describe('chat:thread-settings:set-enabled-skill', () => {
    it('forwards the toggle to thread storage', async () => {
      const handler = ctx.handlers.get(
        'chat:thread-settings:set-enabled-skill'
      )!
      await handler(null, 'thread-1', 'my-skill', true)

      expect(ctx.setThreadEnabledSkill).toHaveBeenCalledWith(
        'thread-1',
        'my-skill',
        true
      )
    })

    it('passes the disabled state through', async () => {
      const handler = ctx.handlers.get(
        'chat:thread-settings:set-enabled-skill'
      )!
      await handler(null, 'thread-1', 'my-skill', false)

      expect(ctx.setThreadEnabledSkill).toHaveBeenCalledWith(
        'thread-1',
        'my-skill',
        false
      )
    })
  })
})
