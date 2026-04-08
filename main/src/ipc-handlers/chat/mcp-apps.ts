import { ipcMain, shell } from 'electron'
import {
  getCachedUiMetadata,
  fetchUiResource,
  proxyMcpToolCall,
} from '../../chat/mcp-tools'
import log from '../../logger'

export function register() {
  ipcMain.handle('chat:get-tool-ui-metadata', () => {
    return getCachedUiMetadata()
  })

  ipcMain.handle(
    'chat:fetch-ui-resource',
    async (_, serverName: string, resourceUri: string) => {
      try {
        const metadata = await fetchUiResource(serverName, resourceUri)
        return { success: true, ...metadata }
      } catch (error) {
        log.error('[MCP Apps] Failed to fetch UI resource:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
  )

  ipcMain.handle(
    'chat:proxy-mcp-tool-call',
    async (
      _,
      serverName: string,
      toolName: string,
      args: Record<string, unknown>
    ) => {
      try {
        const result = await proxyMcpToolCall(serverName, toolName, args)
        return { success: true, result }
      } catch (error) {
        log.error('[MCP Apps] Failed to proxy MCP tool call:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
  )

  ipcMain.handle('chat:open-external-link', async (_, url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        await shell.openExternal(parsed.toString())
        return { success: true }
      }
      return { success: false, error: 'Only http/https URLs are allowed' }
    } catch (error) {
      log.error('[MCP Apps] Failed to open external link:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })
}
