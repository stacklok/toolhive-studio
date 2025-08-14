// Chat request interface
export interface ChatRequest {
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    parts: Array<{
      type: string
      text?: string
    }>
  }>
  provider: string
  model: string
  apiKey: string
  enabledTools?: string[]
}

// MCP Tool information interface
export interface McpToolInfo {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverName: string
}

// Selected model interface
export interface SelectedModel {
  provider: string
  model: string
}

// MCP Server tool mapping
export interface McpServerTools {
  [serverName: string]: string[] // serverName -> [toolName1, toolName2]
}
