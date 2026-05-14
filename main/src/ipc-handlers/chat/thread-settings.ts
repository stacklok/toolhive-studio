import { ipcMain } from 'electron'
import {
  getThreadSelectedModel,
  setThreadSelectedModel,
  getThreadEnabledMcpTools,
  setThreadEnabledMcpTools,
  getThreadEnabledSkills,
  setThreadEnabledSkill,
} from '../../chat/thread-settings-storage'

export function register() {
  ipcMain.handle(
    'chat:thread-settings:get-selected-model',
    (_, threadId: string) => getThreadSelectedModel(threadId)
  )

  ipcMain.handle(
    'chat:thread-settings:set-selected-model',
    (_, threadId: string, provider: string, model: string) =>
      setThreadSelectedModel(threadId, provider, model)
  )

  ipcMain.handle(
    'chat:thread-settings:get-enabled-mcp-tools',
    (_, threadId: string) => getThreadEnabledMcpTools(threadId)
  )

  ipcMain.handle(
    'chat:thread-settings:set-enabled-mcp-tools',
    (_, threadId: string, serverName: string, toolNames: string[]) =>
      setThreadEnabledMcpTools(threadId, serverName, toolNames)
  )

  ipcMain.handle(
    'chat:thread-settings:get-enabled-skills',
    (_, threadId: string) => getThreadEnabledSkills(threadId)
  )

  ipcMain.handle(
    'chat:thread-settings:set-enabled-skill',
    (_, threadId: string, name: string, enabled: boolean) =>
      setThreadEnabledSkill(threadId, name, enabled)
  )
}
