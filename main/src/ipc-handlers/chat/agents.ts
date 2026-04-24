import { ipcMain } from 'electron'
import {
  listAgents,
  getAgent,
  createCustomAgent,
  updateAgent,
  deleteAgent,
  duplicateAgent,
  setThreadAgent,
  getThreadAgentId,
} from '../../chat/agents/registry'
import type {
  CreateAgentInput,
  UpdateAgentInput,
} from '../../chat/agents/types'

export function register() {
  ipcMain.handle('chat:agents:list', () => listAgents())

  ipcMain.handle('chat:agents:get', (_, id: string) => getAgent(id))

  ipcMain.handle('chat:agents:create', (_, input: CreateAgentInput) =>
    createCustomAgent(input)
  )

  ipcMain.handle(
    'chat:agents:update',
    (_, id: string, input: UpdateAgentInput) => updateAgent(id, input)
  )

  ipcMain.handle('chat:agents:delete', (_, id: string) => deleteAgent(id))

  ipcMain.handle('chat:agents:duplicate', (_, id: string) => duplicateAgent(id))

  ipcMain.handle(
    'chat:agents:set-thread-agent',
    (_, threadId: string, agentId: string | null) =>
      setThreadAgent(threadId, agentId)
  )

  ipcMain.handle('chat:agents:get-thread-agent-id', (_, threadId: string) =>
    getThreadAgentId(threadId)
  )
}
