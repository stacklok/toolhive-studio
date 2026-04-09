import { ipcMain, shell } from 'electron'
import * as Sentry from '@sentry/electron/main'
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
      return Sentry.startSpan(
        {
          name: 'MCP Apps fetch UI resource',
          op: 'mcp-apps.fetch',
          attributes: {
            'analytics.source': 'tracking',
            'analytics.type': 'event',
            'mcp_apps.server_name': serverName,
            'mcp_apps.resource_uri': resourceUri,
          },
        },
        async (span) => {
          try {
            const metadata = await fetchUiResource(serverName, resourceUri)
            span.setStatus({ code: 1 })
            return { success: true, ...metadata }
          } catch (error) {
            span.setStatus({
              code: 2,
              message: error instanceof Error ? error.message : String(error),
            })
            log.error('[MCP Apps] Failed to fetch UI resource:', error)
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }
          }
        }
      )
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
      return Sentry.startSpan(
        {
          name: 'MCP Apps proxy tool call',
          op: 'mcp-apps.proxy',
          attributes: {
            'analytics.source': 'tracking',
            'analytics.type': 'event',
            'mcp_apps.server_name': serverName,
            'mcp_apps.tool_name': toolName,
          },
        },
        async (span) => {
          try {
            const result = await proxyMcpToolCall(serverName, toolName, args)
            span.setStatus({ code: 1 })
            return { success: true, result }
          } catch (error) {
            span.setStatus({
              code: 2,
              message: error instanceof Error ? error.message : String(error),
            })
            log.error('[MCP Apps] Failed to proxy MCP tool call:', error)
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }
          }
        }
      )
    }
  )

  ipcMain.handle('chat:open-external-link', async (_, url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        await shell.openExternal(parsed.toString())
        Sentry.addBreadcrumb({
          category: 'mcp-apps',
          message: `Opened external link: ${parsed.origin}`,
          level: 'info',
        })
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
