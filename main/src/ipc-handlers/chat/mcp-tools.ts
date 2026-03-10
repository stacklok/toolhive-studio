import { ipcMain } from 'electron'
import { getMcpServerTools, getToolhiveMcpInfo } from '../../chat'
import {
  getEnabledMcpTools,
  getEnabledMcpServersFromTools,
  saveEnabledMcpTools,
} from '../../chat/settings-storage'

export function register() {
  ipcMain.handle('chat:get-mcp-server-tools', (_, serverName: string) =>
    getMcpServerTools(serverName)
  )
  ipcMain.handle('chat:get-enabled-mcp-tools', () => getEnabledMcpTools())
  ipcMain.handle('chat:get-enabled-mcp-servers-from-tools', () =>
    getEnabledMcpServersFromTools()
  )
  ipcMain.handle(
    'chat:save-enabled-mcp-tools',
    (_, serverName: string, enabledTools: string[]) =>
      saveEnabledMcpTools(serverName, enabledTools)
  )
  ipcMain.handle('chat:get-toolhive-mcp-info', () => getToolhiveMcpInfo())
}
