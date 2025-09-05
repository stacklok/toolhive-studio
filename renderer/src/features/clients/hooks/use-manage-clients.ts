import { useAddClientToGroup } from './use-add-client-to-group'
import { useRemoveClientFromGroup } from './use-remove-client-from-group'
import { COMMON_CLIENTS, type CommonClientName } from '../constants'

/**
 * Hook for managing multiple clients dynamically
 * This avoids hardcoding specific client names in components
 */
export function useManageClients() {
  // Create individual hooks for each common client
  const vscodeManager = useAddClientToGroup({ client: COMMON_CLIENTS[0] })
  const cursorManager = useAddClientToGroup({ client: COMMON_CLIENTS[1] })
  const claudeCodeManager = useAddClientToGroup({ client: COMMON_CLIENTS[2] })

  const vscodeRemover = useRemoveClientFromGroup({ client: COMMON_CLIENTS[0] })
  const cursorRemover = useRemoveClientFromGroup({ client: COMMON_CLIENTS[1] })
  const claudeCodeRemover = useRemoveClientFromGroup({
    client: COMMON_CLIENTS[2],
  })

  // Create a map of client management functions
  const clientManagers = {
    [COMMON_CLIENTS[0]]: {
      addToGroup: vscodeManager.addClientToGroup,
      removeFromGroup: vscodeRemover.removeClientFromGroup,
    },
    [COMMON_CLIENTS[1]]: {
      addToGroup: cursorManager.addClientToGroup,
      removeFromGroup: cursorRemover.removeClientFromGroup,
    },
    [COMMON_CLIENTS[2]]: {
      addToGroup: claudeCodeManager.addClientToGroup,
      removeFromGroup: claudeCodeRemover.removeClientFromGroup,
    },
  } as Record<
    CommonClientName,
    {
      addToGroup: (params: { groupName: string }) => Promise<void>
      removeFromGroup: (params: { groupName: string }) => Promise<void>
    }
  >

  /**
   * Add a client to a group
   */
  const addClientToGroup = async (
    clientName: CommonClientName,
    groupName: string
  ) => {
    const manager = clientManagers[clientName]
    if (!manager) {
      throw new Error(`Unknown client: ${clientName}`)
    }
    await manager.addToGroup({ groupName })
  }

  /**
   * Remove a client from a group
   */
  const removeClientFromGroup = async (
    clientName: CommonClientName,
    groupName: string
  ) => {
    const manager = clientManagers[clientName]
    if (!manager) {
      throw new Error(`Unknown client: ${clientName}`)
    }
    await manager.removeFromGroup({ groupName })
  }

  /**
   * Get the display name for a client
   */
  const getClientDisplayName = (clientName: CommonClientName): string => {
    const displayNames: Record<CommonClientName, string> = {
      vscode: 'VS Code - Copilot',
      cursor: 'Cursor',
      'claude-code': 'Claude Code',
    }
    return displayNames[clientName] || clientName
  }

  /**
   * Get the form field name for a client
   */
  const getClientFieldName = (clientName: CommonClientName): string => {
    const fieldNames: Record<CommonClientName, string> = {
      vscode: 'enableVSCode',
      cursor: 'enableCursor',
      'claude-code': 'enableClaudeCode',
    }
    return (
      fieldNames[clientName] ||
      `enable${clientName.charAt(0).toUpperCase()}${clientName.slice(1)}`
    )
  }

  return {
    addClientToGroup,
    removeClientFromGroup,
    getClientDisplayName,
    getClientFieldName,
    commonClients: COMMON_CLIENTS,
  }
}
