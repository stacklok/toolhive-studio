import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { getApiV1BetaWorkloadsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import type {
  ActivePanel,
  Transport,
  McpServerData,
  McpToolCallResult,
  McpResourceReadResult,
  LogEntry,
  HistoryEntry,
} from './types'
import { connectToMcp, callTool, readResource } from './mcp-client'
import { ConnectionBar } from './components/connection-bar'
import { InspectorSidebar } from './components/inspector-sidebar'
import { ToolsPanel } from './components/tools-panel'
import { ResourcesPanel } from './components/resources-panel'
import { PromptsPanel } from './components/prompts-panel'
import { HeadersPanel } from './components/headers-panel'
import { HistoryPanel } from './components/history-panel'
import { ProtocolLog } from './components/protocol-log'

interface HeaderEntry {
  key: string
  value: string
}

function nowTime(): string {
  const now = new Date()
  return now.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function InspectorPage() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('tools')
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [replayArgs, setReplayArgs] = useState<unknown | undefined>()
  const [showResult, setShowResult] = useState(false)
  const [transport, setTransport] = useState<Transport>('streamable-http')
  const [url, setUrl] = useState('')
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [serverData, setServerData] = useState<McpServerData | null>(null)
  const [mcpLogs, setMcpLogs] = useState<LogEntry[]>([])
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [selectedWorkload, setSelectedWorkload] = useState<CoreWorkload | null>(
    null
  )
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [headers, setHeaders] = useState<HeaderEntry[]>([])
  const [logHeight, setLogHeight] = useState(220)

  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const { data: workloadsData } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
    refetchInterval: 15000,
  })

  const runningWorkloads = useMemo(
    () =>
      (workloadsData?.workloads ?? []).filter(
        (w: CoreWorkload) => w.status === 'running'
      ),
    [workloadsData?.workloads]
  )

  const { serverName: searchServerName } = useSearch({
    from: '/inspector',
  })

  // Auto-select workload from search params (e.g. navigating from server card)
  const autoSelectedRef = useRef(false)
  useEffect(() => {
    if (
      searchServerName &&
      !autoSelectedRef.current &&
      runningWorkloads.length > 0
    ) {
      const match = runningWorkloads.find((w) => w.name === searchServerName)
      if (match) {
        autoSelectedRef.current = true
        handleWorkloadSelect(match)
      }
    }
  }, [searchServerName, runningWorkloads])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = { startY: e.clientY, startHeight: logHeight }
      e.preventDefault()
    },
    [logHeight]
  )

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startY - e.clientY
      const newHeight = Math.max(
        80,
        Math.min(600, dragRef.current.startHeight + delta)
      )
      setLogHeight(newHeight)
    }
    const onMouseUp = () => {
      dragRef.current = null
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handleWorkloadSelect = (workload: CoreWorkload) => {
    setSelectedWorkload(workload)
    setUrl(workload.url ?? '')
    setConnected(false)
    setServerData(null)
    setMcpLogs([])
    setSessionId(undefined)
    setSelectedTool(null)
    setReplayArgs(undefined)
    setShowResult(false)
  }

  const customHeadersMap = () =>
    headers.reduce<Record<string, string>>((acc, h) => {
      if (h.key) acc[h.key] = h.value
      return acc
    }, {})

  const handleToggleConnect = async () => {
    if (connected) {
      setConnected(false)
      setServerData(null)
      setMcpLogs([])
      setSessionId(undefined)
      return
    }
    if (!url) return
    setConnecting(true)
    const start = Date.now()
    try {
      const result = await connectToMcp(url, customHeadersMap())
      const latencyMs = Date.now() - start
      setServerData(result.data)
      setMcpLogs(result.logs)
      setSessionId(result.sessionId)
      setConnected(true)
      setHistory((prev) => [
        {
          time: nowTime(),
          method: 'initialize',
          detail: result.data.serverInfo?.name ?? selectedWorkload?.name ?? url,
          server: selectedWorkload?.name ?? url,
          latencyMs,
          isError: false,
        },
        ...prev,
      ])
      console.log('[InspectorPage] Connection result:', result)
    } catch (err) {
      const latencyMs = Date.now() - start
      setHistory((prev) => [
        {
          time: nowTime(),
          method: 'initialize',
          detail: selectedWorkload?.name ?? url,
          server: selectedWorkload?.name ?? url,
          latencyMs,
          isError: true,
        },
        ...prev,
      ])
      console.error('[InspectorPage] Connection failed:', err)
    } finally {
      setConnecting(false)
    }
  }

  const handleCallTool = async (
    name: string,
    args: unknown
  ): Promise<McpToolCallResult> => {
    const { result, logs } = await callTool(
      url,
      name,
      args,
      customHeadersMap(),
      sessionId
    )
    setMcpLogs((prev) => [...prev, ...logs])
    setHistory((prev) => [
      {
        time: nowTime(),
        method: 'tools/call',
        detail: name,
        server: selectedWorkload?.name ?? url,
        latencyMs: result.latencyMs,
        isError: result.isError ?? false,
        args,
      },
      ...prev,
    ])
    return result
  }

  const handleReadResource = async (
    uri: string
  ): Promise<McpResourceReadResult> => {
    const { result, logs } = await readResource(
      url,
      uri,
      customHeadersMap(),
      sessionId
    )
    setMcpLogs((prev) => [...prev, ...logs])
    return result
  }

  const handleReplay = (entry: HistoryEntry) => {
    if (entry.method === 'tools/call') {
      setActivePanel('tools')
      setSelectedTool(entry.detail)
      setReplayArgs(entry.args)
      setShowResult(false)
    }
  }

  const handleHeaderChange = (
    idx: number,
    field: 'key' | 'value',
    val: string
  ) => {
    setHeaders((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, [field]: val } : h))
    )
  }

  const handleHeaderRemove = (idx: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="-mx-8 -my-5 flex flex-1 flex-col overflow-hidden">
      <ConnectionBar
        transport={transport}
        onTransportChange={setTransport}
        url={url}
        onUrlChange={setUrl}
        connected={connected}
        connecting={connecting}
        onToggleConnect={handleToggleConnect}
      />

      <div className="flex flex-1 overflow-hidden">
        <InspectorSidebar
          workloads={runningWorkloads}
          selectedWorkload={selectedWorkload}
          onWorkloadSelect={handleWorkloadSelect}
          serverData={serverData}
          activePanel={activePanel}
          onPanelChange={(p) => {
            setActivePanel(p)
            setSelectedTool(null)
            setReplayArgs(undefined)
            setShowResult(false)
          }}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {activePanel === 'tools' && (
              <ToolsPanel
                tools={serverData?.tools ?? []}
                selectedTool={selectedTool}
                onSelectTool={(name) => {
                  setSelectedTool(name)
                  if (!name) setReplayArgs(undefined)
                }}
                replayArgs={replayArgs}
                showResult={showResult}
                onShowResult={setShowResult}
                onCallTool={connected ? handleCallTool : undefined}
              />
            )}
            {activePanel === 'resources' && (
              <ResourcesPanel
                resources={serverData?.resources ?? []}
                onReadResource={connected ? handleReadResource : undefined}
              />
            )}
            {activePanel === 'prompts' && (
              <PromptsPanel prompts={serverData?.prompts ?? []} />
            )}
            {activePanel === 'headers' && (
              <HeadersPanel
                headers={headers}
                onHeaderChange={handleHeaderChange}
                onHeaderRemove={handleHeaderRemove}
                onAddHeader={() =>
                  setHeaders((prev) => [...prev, { key: '', value: '' }])
                }
              />
            )}
            {activePanel === 'history' && (
              <HistoryPanel
                entries={history}
                onClear={() => setHistory([])}
                onReplay={handleReplay}
              />
            )}
          </div>
        </div>
      </div>

      <ProtocolLog
        height={logHeight}
        onResizeStart={handleResizeStart}
        entries={mcpLogs}
      />
    </div>
  )
}
