import { register as registerAgents } from './agents'
import { register as registerMcpTools } from './mcp-tools'
import { register as registerMcpApps } from './mcp-apps'
import { register as registerPricing } from './pricing'
import { register as registerProviders } from './providers'
import { register as registerSettings } from './settings'
import { register as registerSkills } from './skills'
import { register as registerStreaming } from './streaming'
import { register as registerThreads } from './threads'
import { register as registerThreadSettings } from './thread-settings'

export function register() {
  registerProviders()
  registerStreaming()
  registerSettings()
  registerMcpTools()
  registerMcpApps()
  registerThreads()
  registerAgents()
  registerSkills()
  registerPricing()
  registerThreadSettings()
}
