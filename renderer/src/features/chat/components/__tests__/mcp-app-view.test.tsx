import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { McpAppView } from '../mcp-app-view'
import { ThemeProviderContext } from '@/common/contexts/theme-context'
import { buildAllowAttribute } from '@modelcontextprotocol/ext-apps/app-bridge'

// ---------------------------------------------------------------------------
// Module-level mock for @modelcontextprotocol/ext-apps/app-bridge
//
// vi.hoisted() ensures the object is created before vi.mock() factory runs,
// so AppBridge can return it. Regular functions (not arrows) are required
// because the component calls `new AppBridge(...)`.
// ---------------------------------------------------------------------------

const mockBridgeInstance = vi.hoisted(() => ({
  oncalltool: undefined as unknown,
  onopenlink: undefined as unknown,
  onmessage: undefined as unknown,
  onsizechange: undefined as unknown,
  onloggingmessage: undefined as unknown,
  onrequestdisplaymode: undefined as unknown,
  addEventListener: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
  sendToolInput: vi.fn().mockResolvedValue(undefined),
  sendToolResult: vi.fn().mockResolvedValue(undefined),
  setHostContext: vi.fn(),
  teardownResource: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@modelcontextprotocol/ext-apps/app-bridge', () => ({
  // Regular named functions so `new AppBridge(...)` works
  AppBridge: function AppBridgeMock() {
    return mockBridgeInstance
  },
  PostMessageTransport: function PostMessageTransportMock() {},
  buildAllowAttribute: vi.fn().mockReturnValue(''),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_HTML = '<html><head></head><body>hello</body></html>'

const DEFAULT_FETCH_RESPONSE = {
  success: true,
  html: DEFAULT_HTML,
  csp: undefined,
  permissions: undefined,
  prefersBorder: undefined,
}

interface RenderViewOptions {
  toolName?: string
  serverName?: string
  resourceUri?: string
  toolInput?: Record<string, unknown>
  toolResult?: unknown
  onMessage?: (text: string) => void
}

function renderView(options: RenderViewOptions = {}) {
  const {
    toolName = 'my-tool',
    serverName = 'my-server',
    resourceUri = 'ui://my-tool/view.html',
    toolInput = {},
    toolResult = undefined,
    onMessage,
  } = options

  return render(
    <ThemeProviderContext.Provider
      value={{ theme: 'light', setTheme: vi.fn().mockResolvedValue(undefined) }}
    >
      <McpAppView
        toolName={toolName}
        serverName={serverName}
        resourceUri={resourceUri}
        toolInput={toolInput}
        toolResult={toolResult}
        onMessage={onMessage}
      />
    </ThemeProviderContext.Provider>
  )
}

/** Fire the iframe load event to trigger setupBridge. */
function triggerIframeLoad() {
  const iframe = screen.getAllByTitle(/MCP App:/i)[0]
  fireEvent.load(iframe)
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset bridge handler properties assigned by setupBridge
  mockBridgeInstance.oncalltool = undefined
  mockBridgeInstance.onopenlink = undefined
  mockBridgeInstance.onmessage = undefined
  mockBridgeInstance.onsizechange = undefined
  mockBridgeInstance.onloggingmessage = undefined
  mockBridgeInstance.onrequestdisplaymode = undefined

  // Reset call counts while re-establishing async defaults
  vi.clearAllMocks()
  mockBridgeInstance.connect.mockResolvedValue(undefined)
  mockBridgeInstance.sendToolInput.mockResolvedValue(undefined)
  mockBridgeInstance.sendToolResult.mockResolvedValue(undefined)
  mockBridgeInstance.teardownResource.mockResolvedValue(undefined)
  mockBridgeInstance.close.mockResolvedValue(undefined)
  vi.mocked(buildAllowAttribute).mockReturnValue('')

  window.electronAPI.chat = {
    ...window.electronAPI.chat,
    fetchUiResource: vi.fn().mockResolvedValue(DEFAULT_FETCH_RESPONSE),
    proxyMcpToolCall: vi.fn(),
    openExternalLink: vi.fn().mockResolvedValue({ success: true }),
  }
})

// ---------------------------------------------------------------------------
// Loading / error states
// ---------------------------------------------------------------------------

describe('loading state', () => {
  it('shows a spinner while fetchUiResource is pending', () => {
    vi.mocked(window.electronAPI.chat.fetchUiResource).mockReturnValue(
      new Promise(() => {})
    )

    renderView()

    expect(screen.getByText('Loading interactive view…')).toBeVisible()
    expect(screen.queryByTitle(/MCP App:/)).not.toBeInTheDocument()
  })
})

describe('error state', () => {
  it('shows an error when fetchUiResource rejects', async () => {
    vi.mocked(window.electronAPI.chat.fetchUiResource).mockRejectedValue(
      new Error('network failure')
    )

    renderView()

    await waitFor(() => {
      expect(screen.getByText('network failure')).toBeVisible()
    })
  })

  it('shows an error when fetchUiResource resolves with success:false', async () => {
    vi.mocked(window.electronAPI.chat.fetchUiResource).mockResolvedValue({
      success: false,
      error: 'Resource not found',
    })

    renderView()

    await waitFor(() => {
      expect(screen.getByText('Resource not found')).toBeVisible()
    })
  })

  it('shows a fallback error message when success:false with no error field', async () => {
    vi.mocked(window.electronAPI.chat.fetchUiResource).mockResolvedValue({
      success: false,
    })

    renderView()

    await waitFor(() => {
      expect(screen.getByText('Failed to load MCP App view')).toBeVisible()
    })
  })
})

// ---------------------------------------------------------------------------
// Iframe render
// ---------------------------------------------------------------------------

describe('iframe render', () => {
  it('renders an iframe after a successful fetch', async () => {
    renderView()

    await waitFor(() => {
      expect(screen.getByTitle('MCP App: my-tool')).toBeInTheDocument()
    })
  })

  it('iframe has sandbox="allow-scripts"', async () => {
    renderView()

    await waitFor(() => {
      expect(screen.getByTitle('MCP App: my-tool')).toHaveAttribute(
        'sandbox',
        'allow-scripts'
      )
    })
  })

  it('iframe title includes the tool name', async () => {
    renderView({ toolName: 'weather-tool' })

    await waitFor(() => {
      expect(screen.getByTitle('MCP App: weather-tool')).toBeInTheDocument()
    })
  })

  it('srcDoc contains the HTML returned by the response', async () => {
    renderView()

    await waitFor(() => {
      const iframe = screen.getByTitle('MCP App: my-tool') as HTMLIFrameElement
      expect(iframe.srcdoc).toContain('hello')
    })
  })
})

// ---------------------------------------------------------------------------
// CSP injection
// ---------------------------------------------------------------------------

describe('CSP injection', () => {
  it('injects a CSP meta tag into the iframe srcDoc', async () => {
    renderView()

    await waitFor(() => {
      const iframe = screen.getByTitle('MCP App: my-tool') as HTMLIFrameElement
      expect(iframe.srcdoc).toContain(
        '<meta http-equiv="Content-Security-Policy"'
      )
    })
  })

  it('uses restrictive defaults when no csp is provided', async () => {
    renderView()

    await waitFor(() => {
      const iframe = screen.getByTitle('MCP App: my-tool') as HTMLIFrameElement
      expect(iframe.srcdoc).toContain("connect-src 'self'")
      expect(iframe.srcdoc).toContain("frame-src 'none'")
    })
  })

  it('includes declared connectDomains in the CSP', async () => {
    vi.mocked(window.electronAPI.chat.fetchUiResource).mockResolvedValue({
      success: true,
      html: DEFAULT_HTML,
      csp: { connectDomains: ['https://api.example.com'] },
    })

    renderView()

    await waitFor(() => {
      const iframe = screen.getByTitle('MCP App: my-tool') as HTMLIFrameElement
      expect(iframe.srcdoc).toContain(
        "connect-src 'self' https://api.example.com"
      )
    })
  })

  it('includes declared frameDomains in frame-src', async () => {
    vi.mocked(window.electronAPI.chat.fetchUiResource).mockResolvedValue({
      success: true,
      html: DEFAULT_HTML,
      csp: { frameDomains: ['https://www.youtube.com'] },
    })

    renderView()

    await waitFor(() => {
      const iframe = screen.getByTitle('MCP App: my-tool') as HTMLIFrameElement
      expect(iframe.srcdoc).toContain('frame-src https://www.youtube.com')
    })
  })
})

// ---------------------------------------------------------------------------
// prefersBorder
// ---------------------------------------------------------------------------

describe('prefersBorder', () => {
  it('applies border class when prefersBorder is true', async () => {
    vi.mocked(window.electronAPI.chat.fetchUiResource).mockResolvedValue({
      ...DEFAULT_FETCH_RESPONSE,
      prefersBorder: true,
    })

    const { container } = renderView()

    await waitFor(() => {
      expect(screen.getByTitle('MCP App: my-tool')).toBeInTheDocument()
    })

    expect(container.querySelector('.border')).not.toBeNull()
  })

  it('omits border class when prefersBorder is false', async () => {
    vi.mocked(window.electronAPI.chat.fetchUiResource).mockResolvedValue({
      ...DEFAULT_FETCH_RESPONSE,
      prefersBorder: false,
    })

    const { container } = renderView()

    await waitFor(() => {
      expect(screen.getByTitle('MCP App: my-tool')).toBeInTheDocument()
    })

    expect(container.querySelector('.border')).toBeNull()
  })

  it('defaults to bordered when prefersBorder is undefined', async () => {
    const { container } = renderView()

    await waitFor(() => {
      expect(screen.getByTitle('MCP App: my-tool')).toBeInTheDocument()
    })

    expect(container.querySelector('.border')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Permissions — buildAllowAttribute
// ---------------------------------------------------------------------------

describe('permissions', () => {
  it('calls buildAllowAttribute with the permissions from the response', async () => {
    const permissions = { microphone: {}, camera: {} }

    vi.mocked(window.electronAPI.chat.fetchUiResource).mockResolvedValue({
      ...DEFAULT_FETCH_RESPONSE,
      permissions,
    })

    renderView()

    await waitFor(() => {
      expect(buildAllowAttribute).toHaveBeenCalledWith(permissions)
    })
  })

  it('sets the allow attribute on the iframe to the value returned by buildAllowAttribute', async () => {
    vi.mocked(buildAllowAttribute).mockReturnValue('microphone camera')
    vi.mocked(window.electronAPI.chat.fetchUiResource).mockResolvedValue({
      ...DEFAULT_FETCH_RESPONSE,
      permissions: { microphone: {}, camera: {} },
    })

    renderView()

    await waitFor(() => {
      const iframe = screen.getByTitle('MCP App: my-tool') as HTMLIFrameElement
      expect(iframe).toHaveAttribute('allow', 'microphone camera')
    })
  })

  it('omits the allow attribute when buildAllowAttribute returns an empty string', async () => {
    renderView()

    await waitFor(() => {
      const iframe = screen.getByTitle('MCP App: my-tool') as HTMLIFrameElement
      expect(iframe).not.toHaveAttribute('allow')
    })
  })
})

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

describe('toolbar', () => {
  it('renders the tool name in the toolbar', async () => {
    renderView({ toolName: 'draw-diagram' })

    await waitFor(() => {
      expect(screen.getByText('draw-diagram')).toBeVisible()
    })
  })

  it('shows the expand (Maximize2) button in inline mode', async () => {
    renderView()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Expand to fullscreen' })
      ).toBeVisible()
    })
  })

  it('entering fullscreen renders the overlay in document.body via portal', async () => {
    const user = userEvent.setup()
    renderView()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Expand to fullscreen' })
      ).toBeVisible()
    })

    await user.click(
      screen.getByRole('button', { name: 'Expand to fullscreen' })
    )

    await waitFor(() => {
      expect(document.body.querySelector('.fixed.inset-0')).not.toBeNull()
    })
  })

  it('shows Exit fullscreen and Close buttons when in fullscreen', async () => {
    const user = userEvent.setup()
    renderView()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Expand to fullscreen' })
      ).toBeVisible()
    })

    await user.click(
      screen.getByRole('button', { name: 'Expand to fullscreen' })
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Exit fullscreen' })
      ).toBeVisible()
      expect(screen.getByRole('button', { name: 'Close' })).toBeVisible()
    })
  })

  it('clicking Exit fullscreen returns to inline mode', async () => {
    const user = userEvent.setup()
    renderView()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Expand to fullscreen' })
      ).toBeVisible()
    })

    await user.click(
      screen.getByRole('button', { name: 'Expand to fullscreen' })
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Exit fullscreen' })
      ).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: 'Exit fullscreen' }))

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Expand to fullscreen' })
      ).toBeVisible()
      expect(document.body.querySelector('.fixed.inset-0')).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// onMessage callback
// ---------------------------------------------------------------------------

describe('onMessage callback', () => {
  it('calls onMessage with the text content when bridge.onmessage fires', async () => {
    const onMessage = vi.fn()
    renderView({ onMessage })

    await waitFor(() => {
      expect(screen.getByTitle('MCP App: my-tool')).toBeInTheDocument()
    })

    act(() => {
      triggerIframeLoad()
    })

    const onmessageHandler = mockBridgeInstance.onmessage as (params: {
      content: unknown
    }) => Promise<object>

    await act(async () => {
      await onmessageHandler({ content: { type: 'text', text: 'hello world' } })
    })

    expect(onMessage).toHaveBeenCalledWith('hello world')
  })

  it('falls back to JSON.stringify when content has no text field', async () => {
    const onMessage = vi.fn()
    renderView({ onMessage })

    await waitFor(() => {
      expect(screen.getByTitle('MCP App: my-tool')).toBeInTheDocument()
    })

    act(() => {
      triggerIframeLoad()
    })

    const onmessageHandler = mockBridgeInstance.onmessage as (params: {
      content: unknown
    }) => Promise<object>

    await act(async () => {
      await onmessageHandler({ content: { type: 'image' } })
    })

    expect(onMessage).toHaveBeenCalledWith('{"type":"image"}')
  })

  it('does not throw when onMessage prop is not provided', async () => {
    renderView()

    await waitFor(() => {
      expect(screen.getByTitle('MCP App: my-tool')).toBeInTheDocument()
    })

    act(() => {
      triggerIframeLoad()
    })

    const onmessageHandler = mockBridgeInstance.onmessage as (params: {
      content: unknown
    }) => Promise<object>

    await expect(
      act(async () => {
        await onmessageHandler({ content: { type: 'text', text: 'hi' } })
      })
    ).resolves.not.toThrow()
  })
})
