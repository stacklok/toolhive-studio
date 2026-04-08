import { useEffect, useRef, useState, useContext, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  AppBridge,
  PostMessageTransport,
  buildAllowAttribute,
} from '@modelcontextprotocol/ext-apps/app-bridge'
import type {
  McpUiHostCapabilities,
  McpUiDisplayMode,
  McpUiResourceCsp,
  McpUiResourcePermissions,
} from '@modelcontextprotocol/ext-apps/app-bridge'
import { ThemeProviderContext } from '@/common/contexts/theme-context'
import { AlertCircle, Loader2, Maximize2, Minimize2, X } from 'lucide-react'
import { Button } from '@/common/components/ui/button'

interface McpAppViewProps {
  toolName: string
  serverName: string
  resourceUri: string
  toolInput: Record<string, unknown>
  toolResult: unknown
  /** Inject a message into the chat on behalf of the view (ui/message) */
  onMessage?: (text: string) => void
}

function resolveTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

const HOST_CAPABILITIES: McpUiHostCapabilities = {
  openLinks: {},
  serverTools: {},
  logging: {},
}

const SUPPORTED_DISPLAY_MODES: McpUiDisplayMode[] = ['inline', 'fullscreen']

/**
 * Build a <meta http-equiv="Content-Security-Policy"> tag from resource CSP
 * metadata, following the spec's restrictive defaults when fields are omitted.
 */
function buildCspMetaTag(csp: McpUiResourceCsp | undefined): string {
  const connect = csp?.connectDomains?.join(' ') ?? ''
  const resource = csp?.resourceDomains?.join(' ') ?? ''
  const frame = csp?.frameDomains?.join(' ') ?? "'none'"
  const base = csp?.baseUriDomains?.join(' ') ?? "'self'"

  const policy = [
    "default-src 'none'",
    `script-src 'self' 'unsafe-inline' ${resource}`.trimEnd(),
    `style-src 'self' 'unsafe-inline' ${resource}`.trimEnd(),
    `connect-src 'self' ${connect}`.trimEnd(),
    `img-src 'self' data: ${resource}`.trimEnd(),
    `font-src 'self' ${resource}`.trimEnd(),
    `media-src 'self' data: ${resource}`.trimEnd(),
    `frame-src ${frame}`,
    "object-src 'none'",
    `base-uri ${base}`,
  ]
    .map((d) => d.trimEnd())
    .join('; ')

  return `<meta http-equiv="Content-Security-Policy" content="${policy}">`
}

/**
 * Inject the CSP meta tag as the first child of <head> so it takes effect
 * before any other resource requests.
 */
function injectCspIntoHtml(
  html: string,
  csp: McpUiResourceCsp | undefined
): string {
  const tag = buildCspMetaTag(csp)
  // Insert right after <head> (or <head ...>) to ensure it's first
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/(<head[^>]*>)/i, `$1${tag}`)
  }
  // Fallback: prepend to document
  return tag + html
}

export function McpAppView({
  toolName,
  serverName,
  resourceUri,
  toolInput,
  toolResult,
  onMessage,
}: McpAppViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const bridgeRef = useRef<AppBridge | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [allowAttr, setAllowAttr] = useState<string>('')
  const [prefersBorder, setPrefersBorder] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [iframeHeight, setIframeHeight] = useState<number>(300)
  const [displayMode, setDisplayMode] = useState<McpUiDisplayMode>('inline')
  const { theme } = useContext(ThemeProviderContext)

  // Fetch the HTML for the MCP App view, inject per-resource CSP.
  // State is keyed off the deps so a dependency change resets to initial values.
  const fetchKey = `${serverName}:${resourceUri}`
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey)
  if (fetchKey !== prevFetchKey) {
    setPrevFetchKey(fetchKey)
    setLoading(true)
    setHtml(null)
    setError(null)
  }

  useEffect(() => {
    let cancelled = false

    window.electronAPI.chat
      .fetchUiResource(serverName, resourceUri)
      .then((res) => {
        if (cancelled) return
        if (res.success && res.html) {
          const csp = res.csp as McpUiResourceCsp | undefined
          const perms = res.permissions as McpUiResourcePermissions | undefined
          setHtml(injectCspIntoHtml(res.html, csp))
          setAllowAttr(buildAllowAttribute(perms))
          setPrefersBorder(res.prefersBorder ?? true)
          setError(null)
        } else {
          setError(res.error ?? 'Failed to load MCP App view')
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Failed to load MCP App view'
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [serverName, resourceUri])

  // Set up AppBridge once the iframe loads
  const setupBridge = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow) return

    // Clean up any existing bridge
    if (bridgeRef.current) {
      bridgeRef.current.close().catch(() => {})
      bridgeRef.current = null
    }

    const currentTheme = resolveTheme()
    const bridge = new AppBridge(
      null, // no MCP client — proxied through IPC
      { name: 'ToolHive Studio', version: '1.0.0' },
      HOST_CAPABILITIES,
      {
        hostContext: {
          theme: currentTheme,
          displayMode: 'inline',
          availableDisplayModes: SUPPORTED_DISPLAY_MODES,
          platform: 'desktop',
          locale: navigator.language,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          userAgent: 'ToolHive Studio',
          deviceCapabilities: { hover: true },
        },
      }
    )

    bridge.oncalltool = async (params) => {
      const res = await window.electronAPI.chat.proxyMcpToolCall(
        serverName,
        params.name,
        params.arguments ?? {}
      )
      if (res.success && res.result) {
        return res.result as Awaited<
          ReturnType<NonNullable<AppBridge['oncalltool']>>
        >
      }
      return {
        content: [
          { type: 'text' as const, text: res.error ?? 'Tool call failed' },
        ],
        isError: true,
      }
    }

    bridge.onopenlink = async ({ url }) => {
      await window.electronAPI.chat.openExternalLink(url)
      return {}
    }

    bridge.onmessage = async ({ content }) => {
      const text =
        typeof content === 'object' &&
        content !== null &&
        'text' in content &&
        typeof (content as { text?: unknown }).text === 'string'
          ? (content as { text: string }).text
          : JSON.stringify(content)
      onMessage?.(text)
      return {}
    }

    bridge.onsizechange = ({ height }) => {
      if (height != null) setIframeHeight(height)
    }

    bridge.onloggingmessage = ({ level, logger, data }) => {
      const prefix = `[MCP App: ${toolName}${logger ? ` / ${logger}` : ''}]`
      if (
        level === 'error' ||
        level === 'critical' ||
        level === 'alert' ||
        level === 'emergency'
      ) {
        console.error(prefix, data)
      } else {
        console.log(prefix, data)
      }
    }

    // Handle display mode requests from the view
    bridge.onrequestdisplaymode = async ({ mode }) => {
      const accepted = (SUPPORTED_DISPLAY_MODES as string[]).includes(mode)
        ? mode
        : 'inline'
      setDisplayMode(accepted as McpUiDisplayMode)
      return { mode: accepted as McpUiDisplayMode }
    }

    bridge.addEventListener('initialized', () => {
      bridge.sendToolInput({ arguments: toolInput }).catch(() => {})
      if (toolResult != null) {
        bridge
          .sendToolResult(
            toolResult as Parameters<AppBridge['sendToolResult']>[0]
          )
          .catch(() => {})
      }
    })

    const transport = new PostMessageTransport(
      iframe.contentWindow,
      iframe.contentWindow
    )

    bridge.connect(transport).catch((err: unknown) => {
      console.error('[McpAppView] Bridge connect failed:', err)
    })

    bridgeRef.current = bridge
  }, [serverName, toolName, toolInput, toolResult, onMessage])

  // Re-send result when it arrives after initialization
  useEffect(() => {
    if (toolResult == null || !bridgeRef.current) return
    bridgeRef.current
      .sendToolResult(toolResult as Parameters<AppBridge['sendToolResult']>[0])
      .catch(() => {})
  }, [toolResult])

  // Propagate theme changes to the view
  useEffect(() => {
    if (!bridgeRef.current) return
    bridgeRef.current.setHostContext({ theme: resolveTheme() })
  }, [theme])

  // Propagate display mode changes to the view
  useEffect(() => {
    if (!bridgeRef.current) return
    bridgeRef.current.setHostContext({ displayMode })
  }, [displayMode])

  // Teardown bridge on unmount
  useEffect(() => {
    return () => {
      const bridge = bridgeRef.current
      if (bridge) {
        bridge
          .teardownResource({})
          .catch(() => {})
          .finally(() => bridge.close().catch(() => {}))
        bridgeRef.current = null
      }
    }
  }, [])

  if (loading) {
    return (
      <div
        className="text-muted-foreground flex items-center gap-2 py-3 text-sm"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading interactive view…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="border-destructive/50 bg-destructive/10 text-destructive flex
          items-center gap-2 rounded-md border px-3 py-2 text-sm"
      >
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  if (!html) return null

  const toolbar = (
    <div
      className="bg-muted/40 flex items-center justify-between border-b px-3
        py-1.5"
    >
      <span className="text-muted-foreground truncate text-xs font-medium">
        {toolName}
      </span>
      <div className="flex items-center gap-1">
        {displayMode === 'fullscreen' ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setDisplayMode('inline')}
              title="Exit fullscreen"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setDisplayMode('inline')}
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setDisplayMode('fullscreen')}
            title="Expand to fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )

  const iframeEl = (
    <iframe
      ref={iframeRef}
      title={`MCP App: ${toolName}`}
      sandbox="allow-scripts"
      allow={allowAttr || undefined}
      srcDoc={html}
      style={{
        height: displayMode === 'fullscreen' ? '100%' : iframeHeight,
        width: '100%',
        border: 'none',
        display: 'block',
        flexGrow: 1,
      }}
      onLoad={setupBridge}
    />
  )

  if (displayMode === 'fullscreen') {
    return createPortal(
      <div
        className="bg-background/80 fixed inset-0 z-50 flex flex-col
          backdrop-blur-sm"
      >
        <div
          className="bg-background m-4 flex flex-1 flex-col overflow-hidden
            rounded-xl border shadow-2xl"
        >
          {toolbar}
          {iframeEl}
        </div>
      </div>,
      document.body
    )
  }

  return (
    <div
      className={
        prefersBorder
          ? 'bg-background mt-2 overflow-hidden rounded-lg border'
          : 'mt-2 overflow-hidden'
      }
      style={{ width: '100%' }}
    >
      {toolbar}
      {iframeEl}
    </div>
  )
}
