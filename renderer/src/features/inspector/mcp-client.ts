import type {
  McpServerData,
  McpTool,
  McpResource,
  McpPrompt,
  McpContentItem,
  McpToolCallResult,
  McpResourceContent,
  McpResourceReadResult,
  LogEntry,
} from './types'

export interface McpConnectionResult {
  data: McpServerData
  logs: LogEntry[]
  sessionId?: string
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  method: string
  id?: number
  params?: unknown
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id?: number
  result?: unknown
  error?: { code: number; message: string }
}

function nowTs(): string {
  const now = new Date()
  const ms = now.getMilliseconds().toString().padStart(3, '0')
  const s = now.getSeconds().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  return `${m}:${s}.${ms}`
}

async function parseResponseBody(response: Response): Promise<JsonRpcResponse> {
  const ct = response.headers.get('content-type') ?? ''

  if (ct.includes('text/event-stream')) {
    // Stream line-by-line — stop as soon as we get the first valid data: line
    // (don't use response.text() which waits for the stream to close)
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body for SSE')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // keep incomplete trailing line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            try {
              const parsed = JSON.parse(data) as JsonRpcResponse
              console.log('[MCP Inspector] SSE data:', data)
              reader.cancel().catch(() => {})
              return parsed
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    throw new Error('No JSON-RPC response found in SSE stream')
  }

  const text = await response.text()
  console.log('[MCP Inspector] JSON body:\n', text)
  return JSON.parse(text) as JsonRpcResponse
}

const TIMEOUT_MS = 15_000

function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  )
}

export async function connectToMcp(
  url: string,
  customHeaders?: Record<string, string>
): Promise<McpConnectionResult> {
  const logs: LogEntry[] = []
  let sessionId: string | undefined
  let msgId = 1

  async function send(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const reqId = req.id != null ? `#${req.id}` : ''
    const preview = JSON.stringify(req.params ?? {})
    logs.push({
      time: nowTs(),
      dir: 'out',
      method: req.method,
      id: reqId,
      preview,
    })
    console.log(`[MCP Inspector] → ${req.method}${reqId}`, req.params ?? {})

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...customHeaders,
      ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
    }

    let response: Response
    try {
      response = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(req),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logs.push({
        time: nowTs(),
        dir: 'in',
        method: req.method,
        id: reqId,
        preview: msg,
        isError: true,
      })
      console.error(`[MCP Inspector] ← ${req.method} FETCH ERROR:`, err)
      throw err
    }

    const newSession = response.headers.get('Mcp-Session-Id')
    if (newSession && newSession !== sessionId) {
      sessionId = newSession
      console.log('[MCP Inspector] Session ID:', sessionId)
    }

    if (req.id == null) {
      console.log(
        `[MCP Inspector] ← ${req.method} (notification) status=${response.status}`
      )
      return null
    }

    const ct = response.headers.get('content-type') ?? ''
    console.log(
      `[MCP Inspector] ← ${req.method}${reqId} status=${response.status} content-type=${ct}`
    )

    let parsed: JsonRpcResponse
    try {
      parsed = await parseResponseBody(response)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logs.push({
        time: nowTs(),
        dir: 'in',
        method: req.method,
        id: reqId,
        preview: msg,
        isError: true,
      })
      console.error(`[MCP Inspector] ← ${req.method}${reqId} PARSE ERROR:`, err)
      throw err
    }

    const isErr = parsed.error != null
    const preview2 = JSON.stringify(parsed.result ?? parsed.error ?? {})
    logs.push({
      time: nowTs(),
      dir: 'in',
      method: req.method,
      id: reqId,
      preview: preview2,
      isError: isErr,
    })

    if (isErr) {
      console.error(
        `[MCP Inspector] ← ${req.method}${reqId} RPC error:`,
        parsed.error
      )
    } else {
      console.log(
        `[MCP Inspector] ← ${req.method}${reqId} result:`,
        parsed.result
      )
    }

    return parsed
  }

  // 1. initialize (must be first)
  const initResp = await send({
    jsonrpc: '2.0',
    method: 'initialize',
    id: msgId++,
    params: {
      protocolVersion: '2025-03-26',
      clientInfo: { name: 'ToolHive Inspector', version: '1.0.0' },
      capabilities: {},
    },
  })

  type InitResult = {
    serverInfo?: McpServerData['serverInfo']
    protocolVersion?: string
  }
  const initResult = initResp?.result as InitResult | undefined
  const serverInfo = initResult?.serverInfo
  const protocolVersion = initResult?.protocolVersion
  console.log(
    '[MCP Inspector] Server info:',
    serverInfo,
    '| Protocol:',
    protocolVersion
  )

  // 2. notifications/initialized (must be before any list calls)
  await send({ jsonrpc: '2.0', method: 'notifications/initialized' })

  // 3. tools/list + resources/list + prompts/list in parallel
  const [toolsRes, resourcesRes, promptsRes] = await Promise.allSettled([
    send({ jsonrpc: '2.0', method: 'tools/list', id: msgId++ }),
    send({ jsonrpc: '2.0', method: 'resources/list', id: msgId++ }),
    send({ jsonrpc: '2.0', method: 'prompts/list', id: msgId++ }),
  ])

  const tools: McpTool[] =
    toolsRes.status === 'fulfilled'
      ? (((toolsRes.value?.result as Record<string, unknown>)
          ?.tools as McpTool[]) ?? [])
      : (console.warn(
          '[MCP Inspector] tools/list failed:',
          (toolsRes as PromiseRejectedResult).reason
        ),
        [])

  const resources: McpResource[] =
    resourcesRes.status === 'fulfilled'
      ? (((resourcesRes.value?.result as Record<string, unknown>)
          ?.resources as McpResource[]) ?? [])
      : (console.warn(
          '[MCP Inspector] resources/list failed:',
          (resourcesRes as PromiseRejectedResult).reason
        ),
        [])

  const prompts: McpPrompt[] =
    promptsRes.status === 'fulfilled'
      ? (((promptsRes.value?.result as Record<string, unknown>)
          ?.prompts as McpPrompt[]) ?? [])
      : (console.warn(
          '[MCP Inspector] prompts/list failed:',
          (promptsRes as PromiseRejectedResult).reason
        ),
        [])

  console.log(
    `[MCP Inspector] Done. Tools: ${tools.length} | Resources: ${resources.length} | Prompts: ${prompts.length}`
  )
  console.log('[MCP Inspector] Tools received:', JSON.stringify(tools, null, 2))

  return {
    data: { serverInfo, protocolVersion, tools, resources, prompts },
    logs,
    sessionId,
  }
}

export async function callTool(
  url: string,
  name: string,
  args: unknown,
  customHeaders?: Record<string, string>,
  sessionId?: string
): Promise<{ result: McpToolCallResult; logs: LogEntry[] }> {
  const logs: LogEntry[] = []
  const reqId = '#call'
  const start = Date.now()

  const preview = JSON.stringify({ name, arguments: args })
  logs.push({
    time: nowTs(),
    dir: 'out',
    method: 'tools/call',
    id: reqId,
    preview,
  })
  console.log(`[MCP Inspector] → tools/call`, { name, arguments: args })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...customHeaders,
    ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
  }

  const req = {
    jsonrpc: '2.0' as const,
    method: 'tools/call',
    id: 99,
    params: { name, arguments: args },
  }

  let response: Response
  try {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(req),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logs.push({
      time: nowTs(),
      dir: 'in',
      method: 'tools/call',
      id: reqId,
      preview: msg,
      isError: true,
    })
    console.error('[MCP Inspector] ← tools/call FETCH ERROR:', err)
    throw err
  }

  const ct = response.headers.get('content-type') ?? ''
  console.log(
    `[MCP Inspector] ← tools/call status=${response.status} content-type=${ct}`
  )

  let parsed: JsonRpcResponse
  try {
    parsed = await parseResponseBody(response)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logs.push({
      time: nowTs(),
      dir: 'in',
      method: 'tools/call',
      id: reqId,
      preview: msg,
      isError: true,
    })
    throw err
  }

  const latencyMs = Date.now() - start
  const isErr = parsed.error != null
  const preview2 = JSON.stringify(parsed.result ?? parsed.error ?? {})
  logs.push({
    time: nowTs(),
    dir: 'in',
    method: 'tools/call',
    id: reqId,
    preview: preview2,
    isError: isErr,
  })

  if (isErr) {
    console.error('[MCP Inspector] ← tools/call RPC error:', parsed.error)
    throw new Error(parsed.error?.message ?? 'Tool call failed')
  }

  console.log('[MCP Inspector] ← tools/call result:', parsed.result)

  type ToolCallResult = { content?: McpContentItem[]; isError?: boolean }
  const r = parsed.result as ToolCallResult
  return {
    result: {
      content: r?.content ?? [],
      isError: r?.isError ?? false,
      latencyMs,
    },
    logs,
  }
}

export async function readResource(
  url: string,
  uri: string,
  customHeaders?: Record<string, string>,
  sessionId?: string
): Promise<{ result: McpResourceReadResult; logs: LogEntry[] }> {
  const logs: LogEntry[] = []
  const reqId = '#read'
  const start = Date.now()

  logs.push({
    time: nowTs(),
    dir: 'out',
    method: 'resources/read',
    id: reqId,
    preview: JSON.stringify({ uri }),
  })
  console.log(`[MCP Inspector] → resources/read`, { uri })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...customHeaders,
    ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
  }

  const req = {
    jsonrpc: '2.0' as const,
    method: 'resources/read',
    id: 98,
    params: { uri },
  }

  let response: Response
  try {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(req),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logs.push({
      time: nowTs(),
      dir: 'in',
      method: 'resources/read',
      id: reqId,
      preview: msg,
      isError: true,
    })
    console.error('[MCP Inspector] ← resources/read FETCH ERROR:', err)
    throw err
  }

  const ct = response.headers.get('content-type') ?? ''
  console.log(
    `[MCP Inspector] ← resources/read status=${response.status} content-type=${ct}`
  )

  let parsed: JsonRpcResponse
  try {
    parsed = await parseResponseBody(response)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logs.push({
      time: nowTs(),
      dir: 'in',
      method: 'resources/read',
      id: reqId,
      preview: msg,
      isError: true,
    })
    throw err
  }

  const latencyMs = Date.now() - start
  const isErr = parsed.error != null
  const preview2 = JSON.stringify(parsed.result ?? parsed.error ?? {})
  logs.push({
    time: nowTs(),
    dir: 'in',
    method: 'resources/read',
    id: reqId,
    preview: preview2,
    isError: isErr,
  })

  if (isErr) {
    console.error('[MCP Inspector] ← resources/read RPC error:', parsed.error)
    throw new Error(parsed.error?.message ?? 'Resource read failed')
  }

  console.log('[MCP Inspector] ← resources/read result:', parsed.result)

  type ReadResult = { contents?: McpResourceContent[] }
  const r = parsed.result as ReadResult
  return {
    result: { contents: r?.contents ?? [], latencyMs },
    logs,
  }
}
