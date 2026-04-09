import { describe, it, expect, vi, beforeEach } from 'vitest'

const ctx = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>()
  const setStatus = vi.fn()
  return {
    handlers,
    setStatus,
    fetchUiResource: vi.fn(),
    proxyMcpToolCall: vi.fn(),
    getCachedUiMetadata: vi.fn(() => ({})),
    startSpan: vi.fn(
      (
        _opts: unknown,
        fn: (span: { setStatus: typeof setStatus }) => unknown
      ) => fn({ setStatus })
    ),
    addBreadcrumb: vi.fn(),
    openExternal: vi.fn().mockResolvedValue(undefined),
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
  shell: {
    openExternal: ctx.openExternal,
  },
}))

vi.mock('../../../chat/mcp-tools', () => ({
  getCachedUiMetadata: ctx.getCachedUiMetadata,
  fetchUiResource: ctx.fetchUiResource,
  proxyMcpToolCall: ctx.proxyMcpToolCall,
}))

vi.mock('../../../logger', () => ({
  default: { error: vi.fn() },
}))

vi.mock('@sentry/electron/main', () => ({
  startSpan: ctx.startSpan,
  addBreadcrumb: ctx.addBreadcrumb,
}))

import { register } from '../mcp-apps'

describe('registerMcpApps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ctx.handlers.clear()
    register()
  })

  it('wraps fetch-ui-resource in Sentry.startSpan and returns success', async () => {
    ctx.fetchUiResource.mockResolvedValue({
      html: '<p>hi</p>',
      csp: undefined,
      permissions: undefined,
      prefersBorder: true,
    })

    const handler = ctx.handlers.get('chat:fetch-ui-resource')!
    const result = await handler(null, 'my-server', 'res://x')

    expect(ctx.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'MCP Apps fetch UI resource',
        op: 'mcp-apps.fetch',
        attributes: expect.objectContaining({
          'mcp_apps.server_name': 'my-server',
          'mcp_apps.resource_uri': 'res://x',
        }),
      }),
      expect.any(Function)
    )
    expect(ctx.setStatus).toHaveBeenCalledWith({ code: 1 })
    expect(result).toMatchObject({ success: true, html: '<p>hi</p>' })
  })

  it('sets span error status when fetch-ui-resource throws', async () => {
    ctx.fetchUiResource.mockRejectedValue(new Error('boom'))

    const handler = ctx.handlers.get('chat:fetch-ui-resource')!
    const result = await handler(null, 's', 'u')

    expect(ctx.setStatus).toHaveBeenCalledWith({
      code: 2,
      message: 'boom',
    })
    expect(result).toEqual({ success: false, error: 'boom' })
  })

  it('wraps proxy-mcp-tool-call in Sentry.startSpan', async () => {
    ctx.proxyMcpToolCall.mockResolvedValue({ content: [] })

    const handler = ctx.handlers.get('chat:proxy-mcp-tool-call')!
    const result = await handler(null, 'srv', 'tool', { a: 1 })

    expect(ctx.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'MCP Apps proxy tool call',
        op: 'mcp-apps.proxy',
        attributes: expect.objectContaining({
          'mcp_apps.server_name': 'srv',
          'mcp_apps.tool_name': 'tool',
        }),
      }),
      expect.any(Function)
    )
    expect(result).toEqual({ success: true, result: { content: [] } })
  })

  it('adds a breadcrumb when open-external-link succeeds', async () => {
    const handler = ctx.handlers.get('chat:open-external-link')!
    const result = await handler(null, 'https://example.com/path?q=1')

    expect(ctx.openExternal).toHaveBeenCalledWith(
      'https://example.com/path?q=1'
    )
    expect(ctx.addBreadcrumb).toHaveBeenCalledWith({
      category: 'mcp-apps',
      message: 'Opened external link: https://example.com',
      level: 'info',
    })
    expect(result).toEqual({ success: true })
  })

  it('does not add a breadcrumb when open-external-link rejects protocol', async () => {
    const handler = ctx.handlers.get('chat:open-external-link')!
    const result = await handler(null, 'file:///etc/passwd')

    expect(ctx.openExternal).not.toHaveBeenCalled()
    expect(ctx.addBreadcrumb).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: false,
      error: 'Only http/https URLs are allowed',
    })
  })
})
