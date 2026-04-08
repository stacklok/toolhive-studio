import { register as registerMcpTools } from './mcp-tools'
import { register as registerMcpApps } from './mcp-apps'
import { register as registerProviders } from './providers'
import { register as registerSettings } from './settings'
import { register as registerStreaming } from './streaming'
import { register as registerThreads } from './threads'

export function register() {
  registerProviders()
  registerStreaming()
  registerSettings()
  registerMcpTools()
  registerMcpApps()
  registerThreads()
}
