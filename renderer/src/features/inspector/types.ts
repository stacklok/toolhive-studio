export type ActivePanel =
  | 'tools'
  | 'resources'
  | 'prompts'
  | 'headers'
  | 'history'
export type Transport = 'streamable-http' | 'sse'
export type ResultTab = 'text' | 'json' | 'image' | 'raw'
export type LogFilter =
  | 'all'
  | 'requests'
  | 'responses'
  | 'notifications'
  | 'errors'

// MCP protocol types (from tools/list, resources/list, prompts/list responses)
export interface McpTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  annotations?: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

export interface McpResource {
  uri: string
  name?: string
  mimeType?: string
  description?: string
}

export interface McpPrompt {
  name: string
  description?: string
  arguments?: Array<{ name: string; required?: boolean; description?: string }>
}

export interface McpServerData {
  serverInfo?: { name: string; version: string }
  protocolVersion?: string
  tools: McpTool[]
  resources: McpResource[]
  prompts: McpPrompt[]
}

export interface McpContentItem {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
}

export interface McpToolCallResult {
  content: McpContentItem[]
  isError?: boolean
  latencyMs?: number
}

export interface McpResourceContent {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}

export interface McpResourceReadResult {
  contents: McpResourceContent[]
  latencyMs?: number
}

export interface HistoryEntry {
  time: string
  method: string
  detail: string
  server: string
  latencyMs?: number
  isError: boolean
  args?: unknown
}

export interface LogEntry {
  time: string
  dir: 'out' | 'in' | 'notif'
  method: string
  id: string
  preview: string
  isError?: boolean
  isWarning?: boolean
}
