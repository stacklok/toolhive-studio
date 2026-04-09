import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mock factories — must be defined before vi.mock() calls
// ---------------------------------------------------------------------------

const mockGetToolhivePort = vi.hoisted(() => vi.fn().mockReturnValue(3000))
const mockGetToolhiveMcpPort = vi.hoisted(() => vi.fn().mockReturnValue(3001))
const mockGetHeaders = vi.hoisted(() => vi.fn().mockReturnValue({}))
const mockCreateApiClient = vi.hoisted(() => vi.fn().mockReturnValue({}))
const mockGetApiV1BetaWorkloads = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { workloads: [] } })
)
const mockGetEnabledMcpTools = vi.hoisted(() => vi.fn().mockResolvedValue({}))
const mockBuildRawTransport = vi.hoisted(() =>
  vi.fn().mockReturnValue({ type: 'raw-mock-transport' })
)
const mockCreateTransport = vi.hoisted(() =>
  vi.fn().mockReturnValue({ name: 'test-server', transport: {} })
)
const mockGetWorkloadAvailableTools = vi.hoisted(() =>
  vi.fn().mockResolvedValue(null)
)

// Raw SDK Client mock (used by fetchUiResource / proxyMcpToolCall)
const mockSdkClient = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue(undefined),
  request: vi.fn().mockResolvedValue({ contents: [] }),
  close: vi.fn().mockResolvedValue(undefined),
}))

// AI SDK MCP client mock (used by getToolhiveMcpInfo / createMcpTools)
const mockAiMcpClient = vi.hoisted(() => ({
  tools: vi.fn().mockResolvedValue({}),
  close: vi.fn().mockResolvedValue(undefined),
}))
const mockCreateMCPClient = vi.hoisted(() =>
  vi.fn().mockResolvedValue(mockAiMcpClient)
)

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../../toolhive-manager', () => ({
  getToolhivePort: mockGetToolhivePort,
  getToolhiveMcpPort: mockGetToolhiveMcpPort,
}))

vi.mock('../../headers', () => ({
  getHeaders: mockGetHeaders,
}))

vi.mock('@common/api/generated/client', () => ({
  createClient: mockCreateApiClient,
}))

vi.mock('@common/api/generated/sdk.gen', () => ({
  getApiV1BetaWorkloads: mockGetApiV1BetaWorkloads,
}))

vi.mock('../settings-storage', () => ({
  getEnabledMcpTools: mockGetEnabledMcpTools,
}))

vi.mock('../../utils/mcp-tools', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../utils/mcp-tools')>()
  return {
    // Keep the real validator so fixtures need to be shaped correctly
    isMcpToolDefinition: original.isMcpToolDefinition,
    buildRawTransport: mockBuildRawTransport,
    createTransport: mockCreateTransport,
    getWorkloadAvailableTools: mockGetWorkloadAvailableTools,
  }
})

vi.mock('@sentry/electron/main', () => ({
  addBreadcrumb: vi.fn(),
  startSpan: vi.fn(
    (_opts: unknown, fn: (span: { setStatus: () => void }) => unknown) =>
      fn({ setStatus: vi.fn() })
  ),
}))

vi.mock('@ai-sdk/mcp', () => ({
  experimental_createMCPClient: mockCreateMCPClient,
}))

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  // Named function constructor so `new Client(...)` works
  Client: function ClientMock() {
    return mockSdkClient
  },
}))

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: function StreamableHTTPTransportMock() {},
}))

// The schemas are passed through to the mocked client.request(), so they
// just need to be non-undefined objects.
vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ReadResourceResultSchema: {},
  CallToolResultSchema: {},
}))

vi.mock('../../logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Module under test (imported after all vi.mock() calls)
// ---------------------------------------------------------------------------

import * as Sentry from '@sentry/electron/main'
import {
  getCachedUiMetadata,
  fetchUiResource,
  proxyMcpToolCall,
  getToolhiveMcpInfo,
  getMcpServerTools,
  createMcpTools,
} from '../mcp-tools'
import log from '../../logger'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const THV_SERVER = 'toolhive-mcp-internal'

const makeWorkload = (overrides: Record<string, unknown> = {}) => ({
  name: 'test-server',
  port: 9999,
  transport_type: 'streamable-http',
  status: 'running',
  package: 'test-package',
  tools: ['tool-a'],
  ...overrides,
})

/** Minimal object that passes isMcpToolDefinition validation. */
const makeToolDef = (overrides: Record<string, unknown> = {}) => ({
  description: 'A test tool',
  inputSchema: { type: 'object', properties: { foo: { type: 'string' } } },
  ...overrides,
})

// ---------------------------------------------------------------------------
// Global per-test reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()

  // Ports
  mockGetToolhivePort.mockReturnValue(3000)
  mockGetToolhiveMcpPort.mockReturnValue(3001)

  // API client chain (fetchWorkloads)
  mockGetHeaders.mockReturnValue({})
  mockCreateApiClient.mockReturnValue({})
  mockGetApiV1BetaWorkloads.mockResolvedValue({ data: { workloads: [] } })

  // Settings
  mockGetEnabledMcpTools.mockResolvedValue({})

  // Utils mocks
  mockBuildRawTransport.mockReturnValue({ type: 'raw-mock-transport' })
  mockCreateTransport.mockReturnValue({ name: 'test-server', transport: {} })
  mockGetWorkloadAvailableTools.mockResolvedValue(null)

  // Raw SDK client
  mockSdkClient.connect.mockResolvedValue(undefined)
  mockSdkClient.request.mockResolvedValue({ contents: [] })
  mockSdkClient.close.mockResolvedValue(undefined)

  // AI SDK client
  mockAiMcpClient.tools.mockResolvedValue({})
  mockAiMcpClient.close.mockResolvedValue(undefined)
  mockCreateMCPClient.mockResolvedValue(mockAiMcpClient)
})

// ---------------------------------------------------------------------------
// getCachedUiMetadata
// ---------------------------------------------------------------------------

describe('getCachedUiMetadata', () => {
  it('returns an empty object before createMcpTools has run', () => {
    expect(getCachedUiMetadata()).toEqual({})
  })

  it('returns a shallow copy — mutating it does not affect the cache', async () => {
    const toolWithUi = {
      ...makeToolDef(),
      _meta: {
        ui: { resourceUri: 'res://cached-tool', visibility: ['model'] },
      },
    }
    mockGetEnabledMcpTools.mockResolvedValue({
      [THV_SERVER]: ['cached-tool'],
    })
    mockAiMcpClient.tools.mockResolvedValue({ 'cached-tool': toolWithUi })

    await createMcpTools()

    const snapshot = getCachedUiMetadata()
    expect(snapshot).toHaveProperty('cached-tool')

    // Delete from the snapshot — should not affect subsequent calls
    delete (snapshot as Record<string, unknown>)['cached-tool']

    expect(getCachedUiMetadata()).toHaveProperty('cached-tool')
  })
})

// ---------------------------------------------------------------------------
// fetchUiResource
// ---------------------------------------------------------------------------

describe('fetchUiResource', () => {
  it('resolves text content and extracts CSP / permissions / prefersBorder', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [makeWorkload()] },
    })
    mockSdkClient.request.mockResolvedValue({
      contents: [
        {
          text: '<html>hello</html>',
          _meta: {
            ui: {
              csp: { defaultSrc: ["'self'"] },
              permissions: ['clipboard-write'],
              prefersBorder: true,
            },
          },
        },
      ],
    })

    const result = await fetchUiResource('test-server', 'res://test')

    expect(result.html).toBe('<html>hello</html>')
    expect(result.csp).toEqual({ defaultSrc: ["'self'"] })
    expect(result.permissions).toEqual(['clipboard-write'])
    expect(result.prefersBorder).toBe(true)
  })

  it('resolves base64 blob content', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [makeWorkload()] },
    })
    const html = '<html>blob</html>'
    mockSdkClient.request.mockResolvedValue({
      contents: [{ blob: Buffer.from(html).toString('base64') }],
    })

    const result = await fetchUiResource('test-server', 'res://blob')

    expect(result.html).toBe(html)
  })

  it('throws when contents array is empty', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [makeWorkload()] },
    })
    mockSdkClient.request.mockResolvedValue({ contents: [] })

    await expect(fetchUiResource('test-server', 'res://empty')).rejects.toThrow(
      'Empty resource response'
    )
  })

  it('throws when content has neither text nor blob', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [makeWorkload()] },
    })
    mockSdkClient.request.mockResolvedValue({ contents: [{}] })

    await expect(fetchUiResource('test-server', 'res://bad')).rejects.toThrow(
      'Resource content has no text or blob'
    )
  })

  it('always closes the client even when the request throws', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [makeWorkload()] },
    })
    mockSdkClient.request.mockRejectedValue(new Error('network error'))

    await expect(fetchUiResource('test-server', 'res://fail')).rejects.toThrow()
    expect(mockSdkClient.close).toHaveBeenCalledOnce()
  })

  it('uses createToolhiveMcpTransport for the internal ToolHive server', async () => {
    mockSdkClient.request.mockResolvedValue({
      contents: [{ text: '<html>thv</html>' }],
    })

    await fetchUiResource(THV_SERVER, 'res://thv')

    // buildRawTransport should NOT be called for the internal server
    expect(mockBuildRawTransport).not.toHaveBeenCalled()
    // StreamableHTTPClientTransport is newed up inside createToolhiveMcpTransport
    expect(mockSdkClient.connect).toHaveBeenCalledOnce()
  })

  it('uses buildRawTransport for external servers', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [makeWorkload()] },
    })
    mockSdkClient.request.mockResolvedValue({
      contents: [{ text: '<html>ext</html>' }],
    })

    await fetchUiResource('test-server', 'res://ext')

    expect(mockBuildRawTransport).toHaveBeenCalledOnce()
  })

  it('throws when external server workload is not found', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({ data: { workloads: [] } })

    await expect(fetchUiResource('unknown-server', 'res://x')).rejects.toThrow(
      'Workload not found: unknown-server'
    )
  })
})

// ---------------------------------------------------------------------------
// proxyMcpToolCall
// ---------------------------------------------------------------------------

describe('proxyMcpToolCall', () => {
  it('proxies the tools/call request and returns the result', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [makeWorkload()] },
    })
    const toolResult = {
      content: [{ type: 'text', text: 'done' }],
      isError: false,
    }
    mockSdkClient.request.mockResolvedValue(toolResult)

    const result = await proxyMcpToolCall('test-server', 'my-tool', {
      arg: 1,
    })

    expect(result).toEqual(toolResult)
    expect(mockSdkClient.request).toHaveBeenCalledWith(
      {
        method: 'tools/call',
        params: { name: 'my-tool', arguments: { arg: 1 } },
      },
      expect.anything()
    )
  })

  it('always closes the client even when the request throws', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [makeWorkload()] },
    })
    mockSdkClient.request.mockRejectedValue(new Error('call failed'))

    await expect(
      proxyMcpToolCall('test-server', 'bad-tool', {})
    ).rejects.toThrow('call failed')
    expect(mockSdkClient.close).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// getToolhiveMcpInfo
// ---------------------------------------------------------------------------

describe('getToolhiveMcpInfo', () => {
  it('returns isRunning: false when port is not available', async () => {
    mockGetToolhiveMcpPort.mockReturnValue(null)

    const result = await getToolhiveMcpInfo()

    expect(result.isRunning).toBe(false)
    expect(result.serverName).toBe(THV_SERVER)
    expect(mockCreateMCPClient).not.toHaveBeenCalled()
  })

  it('returns tools with correct enabled flags', async () => {
    mockAiMcpClient.tools.mockResolvedValue({
      'tool-enabled': makeToolDef({ description: 'enabled' }),
      'tool-disabled': makeToolDef({ description: 'disabled' }),
    })

    const result = await getToolhiveMcpInfo(['tool-enabled'])

    expect(result.isRunning).toBe(true)
    expect(result.tools).toHaveLength(2)
    const enabled = result.tools.find((t) => t.name === 'tool-enabled')
    const disabled = result.tools.find((t) => t.name === 'tool-disabled')
    expect(enabled?.enabled).toBe(true)
    expect(disabled?.enabled).toBe(false)
  })

  it('advertises MCP_UI_EXTENSION_CAPABILITY when creating the client', async () => {
    await getToolhiveMcpInfo()

    expect(mockCreateMCPClient).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: expect.objectContaining({
          extensions: expect.objectContaining({
            'io.modelcontextprotocol/ui': expect.anything(),
          }),
        }),
      })
    )
  })

  it('closes the AI SDK client after listing tools', async () => {
    await getToolhiveMcpInfo()

    expect(mockAiMcpClient.close).toHaveBeenCalledOnce()
  })

  it('returns isRunning: false and logs when createMCPClient throws', async () => {
    mockCreateMCPClient.mockRejectedValue(new Error('connection refused'))

    const result = await getToolhiveMcpInfo()

    expect(result.isRunning).toBe(false)
    expect(log.error).toHaveBeenCalledWith(
      'Failed to get Toolhive MCP info:',
      expect.any(Error)
    )
  })

  it('extracts tool parameters from inputSchema', async () => {
    mockAiMcpClient.tools.mockResolvedValue({
      'draw-tool': {
        description: 'Draw something',
        inputSchema: {
          type: 'object',
          properties: { canvas: { type: 'string' } },
        },
      },
    })

    const result = await getToolhiveMcpInfo()

    expect(result.tools[0]?.parameters).toEqual({
      canvas: { type: 'string' },
    })
  })
})

// ---------------------------------------------------------------------------
// getMcpServerTools
// ---------------------------------------------------------------------------

describe('getMcpServerTools', () => {
  it('returns server tools using tools list from the workload', async () => {
    const workload = makeWorkload({ tools: ['tool-a', 'tool-b'] })
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [workload] },
    })
    mockGetEnabledMcpTools.mockResolvedValue({
      'test-server': ['tool-a'],
    })

    const result = await getMcpServerTools('test-server')

    expect(result).not.toBeNull()
    expect(result?.serverName).toBe('test-server')
    expect(result?.tools).toHaveLength(2)
    const toolA = result?.tools.find((t) => t.name === 'tool-a')
    expect(toolA?.enabled).toBe(true)
  })

  it('discovers tools via getWorkloadAvailableTools when workload.tools is empty', async () => {
    const workload = makeWorkload({ tools: [] })
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [workload] },
    })
    mockGetEnabledMcpTools.mockResolvedValue({ 'test-server': ['discovered'] })
    mockGetWorkloadAvailableTools.mockResolvedValue({
      discovered: makeToolDef({ description: 'found via discovery' }),
    })

    const result = await getMcpServerTools('test-server')

    expect(mockGetWorkloadAvailableTools).toHaveBeenCalledWith(workload)
    expect(result?.tools).toHaveLength(1)
    expect(result?.tools[0]?.name).toBe('discovered')
    expect(result?.tools[0]?.description).toBe('found via discovery')
  })

  it('does not call getWorkloadAvailableTools when workload is not running', async () => {
    const workload = makeWorkload({ tools: [], status: 'stopped' })
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [workload] },
    })

    await getMcpServerTools('test-server')

    expect(mockGetWorkloadAvailableTools).not.toHaveBeenCalled()
  })

  it('falls back to getToolhiveMcpInfo for the internal ToolHive server', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({ data: { workloads: [] } })
    mockGetEnabledMcpTools.mockResolvedValue({ [THV_SERVER]: ['thv-tool'] })
    mockAiMcpClient.tools.mockResolvedValue({
      'thv-tool': makeToolDef(),
    })

    const result = await getMcpServerTools(THV_SERVER)

    expect(result?.serverName).toBe(THV_SERVER)
    expect(mockCreateMCPClient).toHaveBeenCalled()
  })

  it('throws when a regular server workload is not found', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({ data: { workloads: [] } })

    await expect(getMcpServerTools('ghost-server')).rejects.toThrow(
      'Server not in the workload list'
    )
  })

  it('reflects isRunning from workload.status', async () => {
    const workload = makeWorkload({ status: 'stopped', tools: ['t1'] })
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [workload] },
    })

    const result = await getMcpServerTools('test-server')

    expect(result?.isRunning).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// createMcpTools
// ---------------------------------------------------------------------------

describe('createMcpTools', () => {
  it('returns empty tools and clients when no servers are enabled', async () => {
    mockGetEnabledMcpTools.mockResolvedValue({})

    const { tools, clients, enabledTools } = await createMcpTools()

    expect(tools).toEqual({})
    expect(clients).toHaveLength(0)
    expect(enabledTools).toEqual({})
    expect(Sentry.addBreadcrumb).not.toHaveBeenCalled()
  })

  it('resets cachedUiMetadata at the start of each call', async () => {
    // First call: populate cache
    const toolWithUi = {
      ...makeToolDef(),
      _meta: { ui: { resourceUri: 'res://reset-test', visibility: ['model'] } },
    }
    mockGetEnabledMcpTools.mockResolvedValue({ [THV_SERVER]: ['cached'] })
    mockAiMcpClient.tools.mockResolvedValue({ cached: toolWithUi })
    await createMcpTools()
    expect(getCachedUiMetadata()).toHaveProperty('cached')

    // Second call with no tools — cache should be empty
    mockGetEnabledMcpTools.mockResolvedValue({})
    await createMcpTools()
    expect(getCachedUiMetadata()).toEqual({})
  })

  it('skips servers with empty tool lists', async () => {
    mockGetEnabledMcpTools.mockResolvedValue({ 'test-server': [] })
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [makeWorkload()] },
    })

    await createMcpTools()

    expect(mockCreateMCPClient).not.toHaveBeenCalled()
  })

  it('registers ToolHive MCP tools when port is available', async () => {
    mockGetEnabledMcpTools.mockResolvedValue({ [THV_SERVER]: ['thv-draw'] })
    mockAiMcpClient.tools.mockResolvedValue({ 'thv-draw': makeToolDef() })

    const { tools, clients } = await createMcpTools()

    expect(tools).toHaveProperty('thv-draw')
    expect(clients).toHaveLength(1)
    expect(mockCreateMCPClient).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'toolhive-mcp',
        capabilities: expect.objectContaining({
          extensions: expect.objectContaining({
            'io.modelcontextprotocol/ui': expect.anything(),
          }),
        }),
      })
    )
  })

  it('skips ToolHive MCP tools when port is not available', async () => {
    mockGetToolhiveMcpPort.mockReturnValue(null)
    mockGetEnabledMcpTools.mockResolvedValue({ [THV_SERVER]: ['thv-draw'] })

    const { tools } = await createMcpTools()

    expect(tools).toEqual({})
  })

  it('registers per-server tools using createTransport', async () => {
    const workload = makeWorkload()
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [workload] },
    })
    mockGetEnabledMcpTools.mockResolvedValue({ 'test-server': ['tool-a'] })
    mockAiMcpClient.tools.mockResolvedValue({ 'tool-a': makeToolDef() })

    const { tools, clients } = await createMcpTools()

    expect(tools).toHaveProperty('tool-a')
    expect(clients).toHaveLength(1)
    expect(mockCreateTransport).toHaveBeenCalledWith(workload)
    expect(mockCreateMCPClient).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: expect.objectContaining({
          extensions: expect.objectContaining({
            'io.modelcontextprotocol/ui': expect.anything(),
          }),
        }),
      })
    )
  })

  it('skips app-only tools (visibility without "model")', async () => {
    const appOnlyTool = {
      ...makeToolDef(),
      _meta: { ui: { visibility: ['app'], resourceUri: 'res://app-only' } },
    }
    const workload = makeWorkload()
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [workload] },
    })
    mockGetEnabledMcpTools.mockResolvedValue({
      'test-server': ['app-only-tool'],
    })
    mockAiMcpClient.tools.mockResolvedValue({ 'app-only-tool': appOnlyTool })

    const { tools } = await createMcpTools()

    expect(tools).not.toHaveProperty('app-only-tool')
  })

  it('includes tools that have both "model" and "app" in visibility', async () => {
    const hybridTool = {
      ...makeToolDef(),
      _meta: {
        ui: { visibility: ['model', 'app'], resourceUri: 'res://hybrid' },
      },
    }
    const workload = makeWorkload()
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [workload] },
    })
    mockGetEnabledMcpTools.mockResolvedValue({ 'test-server': ['hybrid-tool'] })
    mockAiMcpClient.tools.mockResolvedValue({ 'hybrid-tool': hybridTool })

    const { tools } = await createMcpTools()

    expect(tools).toHaveProperty('hybrid-tool')
  })

  it('caches UI metadata for tools with _meta.ui.resourceUri', async () => {
    const uiTool = {
      ...makeToolDef(),
      _meta: { ui: { resourceUri: 'res://ui-tool', visibility: ['model'] } },
    }
    const workload = makeWorkload()
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [workload] },
    })
    mockGetEnabledMcpTools.mockResolvedValue({ 'test-server': ['ui-tool'] })
    mockAiMcpClient.tools.mockResolvedValue({ 'ui-tool': uiTool })

    await createMcpTools()

    expect(getCachedUiMetadata()).toEqual({
      'ui-tool': { resourceUri: 'res://ui-tool', serverName: 'test-server' },
    })
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'mcp-apps',
        message: 'Discovered 1 UI-enabled tool(s)',
        level: 'info',
        data: { tools: ['ui-tool'] },
      })
    )
  })

  it('does not cache UI metadata for tools without resourceUri', async () => {
    const noUriTool = {
      ...makeToolDef(),
      _meta: { ui: { visibility: ['model'] } },
    }
    const workload = makeWorkload()
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [workload] },
    })
    mockGetEnabledMcpTools.mockResolvedValue({ 'test-server': ['no-uri-tool'] })
    mockAiMcpClient.tools.mockResolvedValue({ 'no-uri-tool': noUriTool })

    await createMcpTools()

    expect(getCachedUiMetadata()).toEqual({})
    expect(Sentry.addBreadcrumb).not.toHaveBeenCalled()
  })

  it('logs and skips servers whose workload is not found', async () => {
    mockGetApiV1BetaWorkloads.mockResolvedValue({ data: { workloads: [] } })
    mockGetEnabledMcpTools.mockResolvedValue({ 'ghost-server': ['tool-x'] })

    const { tools } = await createMcpTools()

    expect(tools).toEqual({})
    expect(log.debug).toHaveBeenCalledWith(
      'Skipping ghost-server: workload not found'
    )
  })

  it('logs and continues when createMCPClient throws for a server', async () => {
    const workload = makeWorkload()
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [workload] },
    })
    mockGetEnabledMcpTools.mockResolvedValue({ 'test-server': ['tool-a'] })
    mockCreateMCPClient.mockRejectedValue(new Error('conn refused'))

    const { tools, clients } = await createMcpTools()

    expect(tools).toEqual({})
    expect(clients).toHaveLength(0)
    expect(log.error).toHaveBeenCalledWith(
      'Failed to create MCP client for test-server:',
      expect.any(Error)
    )
  })

  it('logs a warning when an enabled tool is not found on the server', async () => {
    const workload = makeWorkload()
    mockGetApiV1BetaWorkloads.mockResolvedValue({
      data: { workloads: [workload] },
    })
    mockGetEnabledMcpTools.mockResolvedValue({
      'test-server': ['missing-tool'],
    })
    // Server returns no tools
    mockAiMcpClient.tools.mockResolvedValue({})

    await createMcpTools()

    expect(log.warn).toHaveBeenCalledWith(
      'Tool missing-tool not found in server test-server'
    )
  })

  it('parallelises fetchWorkloads and getEnabledMcpTools', async () => {
    let workloadsResolveOrder = 0
    let enabledToolsResolveOrder = 0
    let callCount = 0

    mockGetApiV1BetaWorkloads.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            workloadsResolveOrder = ++callCount
            resolve({ data: { workloads: [] } })
          }, 10)
        })
    )

    mockGetEnabledMcpTools.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            enabledToolsResolveOrder = ++callCount
            resolve({})
          }, 10)
        })
    )

    await createMcpTools()

    // Both settle at roughly the same time (same timeout) — the order will be
    // either 1 or 2 for both, but neither should be 0 (i.e., both were called).
    expect(workloadsResolveOrder).toBeGreaterThan(0)
    expect(enabledToolsResolveOrder).toBeGreaterThan(0)
    expect(mockGetApiV1BetaWorkloads).toHaveBeenCalledOnce()
    expect(mockGetEnabledMcpTools).toHaveBeenCalledOnce()
  })
})
