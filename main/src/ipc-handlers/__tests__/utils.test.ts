import { describe, it, expect, vi, beforeEach } from 'vitest'

const ctx = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>()
  return {
    handlers,
    getHeaders: vi.fn(() => ({ 'x-test': '1' })),
    getInstanceId: vi.fn().mockResolvedValue('instance-abc'),
    isOfficialReleaseBuild: vi.fn(() => false),
    getWorkloadAvailableTools: vi.fn(),
  }
})

vi.mock('electron', () => ({
  ipcMain: {
    handle: (
      channel: string,
      handler: (...args: unknown[]) => Promise<unknown>
    ) => {
      ctx.handlers.set(channel, handler)
    },
  },
}))

vi.mock('../../headers', () => ({
  getHeaders: ctx.getHeaders,
}))

vi.mock('../../util', () => ({
  getInstanceId: ctx.getInstanceId,
  isOfficialReleaseBuild: ctx.isOfficialReleaseBuild,
}))

vi.mock('../../utils/mcp-tools', () => ({
  getWorkloadAvailableTools: ctx.getWorkloadAvailableTools,
}))

import { register } from '../utils'

describe('utils IPC handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ctx.handlers.clear()
    register()
  })

  describe('utils:get-workload-available-tools', () => {
    const invoke = async (payload: unknown) => {
      const handler = ctx.handlers.get('utils:get-workload-available-tools')!
      return handler(null, payload)
    }

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['string', 'not-an-object'],
      ['number', 42],
      ['array', [{ name: 'x' }]],
    ])(
      'rejects non-object payload (%s) with TypeError',
      async (_label, bad) => {
        await expect(invoke(bad)).rejects.toBeInstanceOf(TypeError)
        expect(ctx.getWorkloadAvailableTools).not.toHaveBeenCalled()
      }
    )

    it('rejects invalid transport_type (prototype key)', async () => {
      await expect(
        invoke({ name: 'a', transport_type: '__proto__' })
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        invoke({ name: 'a', transport_type: 'constructor' })
      ).rejects.toBeInstanceOf(TypeError)
      expect(ctx.getWorkloadAvailableTools).not.toHaveBeenCalled()
    })

    it('rejects invalid proxy_mode', async () => {
      await expect(
        invoke({ name: 'a', proxy_mode: 'stdio' })
      ).rejects.toBeInstanceOf(TypeError)
    })

    it('rejects non-integer or out-of-range port', async () => {
      await expect(
        invoke({ name: 'a', port: Number.NaN })
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        invoke({ name: 'a', port: Number.POSITIVE_INFINITY })
      ).rejects.toBeInstanceOf(TypeError)
      await expect(invoke({ name: 'a', port: 3.14 })).rejects.toBeInstanceOf(
        TypeError
      )
      await expect(invoke({ name: 'a', port: -1 })).rejects.toBeInstanceOf(
        TypeError
      )
      await expect(invoke({ name: 'a', port: 70000 })).rejects.toBeInstanceOf(
        TypeError
      )
    })

    it('rejects non-http(s) url', async () => {
      await expect(
        invoke({ name: 'a', url: 'file:///etc/passwd' })
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        invoke({ name: 'a', url: 'javascript:alert(1)' })
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        invoke({ name: 'a', url: 'not a url' })
      ).rejects.toBeInstanceOf(TypeError)
    })

    it('rejects non-string name / non-boolean remote', async () => {
      await expect(invoke({ name: 123 })).rejects.toBeInstanceOf(TypeError)
      await expect(
        invoke({ name: 'a', remote: 'true' })
      ).rejects.toBeInstanceOf(TypeError)
    })

    it('forwards a valid full workload to getWorkloadAvailableTools', async () => {
      ctx.getWorkloadAvailableTools.mockResolvedValue({ tool: {} })
      const workload = {
        name: 'weather',
        url: 'http://localhost:3000/mcp',
        transport_type: 'streamable-http',
        proxy_mode: 'streamable-http',
        port: 3000,
        remote: false,
      }

      const result = await invoke(workload)

      expect(ctx.getWorkloadAvailableTools).toHaveBeenCalledWith(workload)
      expect(result).toEqual({ tool: {} })
    })

    it('forwards a valid partial workload (empty object) — consumer returns null when name is missing', async () => {
      ctx.getWorkloadAvailableTools.mockResolvedValue(null)

      const result = await invoke({})

      expect(ctx.getWorkloadAvailableTools).toHaveBeenCalledWith({})
      expect(result).toBeNull()
    })

    it('tolerates empty url string (createTransport falls back to localhost)', async () => {
      ctx.getWorkloadAvailableTools.mockResolvedValue({})
      await invoke({ name: 'a', url: '' })
      expect(ctx.getWorkloadAvailableTools).toHaveBeenCalledTimes(1)
    })
  })

  it('telemetry-headers returns current headers', () => {
    const handler = ctx.handlers.get('telemetry-headers')!
    expect(handler(null)).toEqual({ 'x-test': '1' })
  })

  it('is-official-release-build returns the flag', () => {
    const handler = ctx.handlers.get('is-official-release-build')!
    expect(handler(null)).toBe(false)
  })

  it('get-instance-id returns the resolved id', async () => {
    const handler = ctx.handlers.get('get-instance-id')!
    await expect(handler(null)).resolves.toBe('instance-abc')
  })
})
