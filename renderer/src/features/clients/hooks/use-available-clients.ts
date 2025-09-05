import { useSuspenseQuery } from '@tanstack/react-query'
import { getApiV1BetaDiscoveryClientsOptions } from '@api/@tanstack/react-query.gen'
import type { ClientMcpClientStatus } from '@api/types.gen'

/**
 * Hook to get the list of clients that users can enable
 * Uses the discovery clients API to dynamically get installed clients
 */
export function useAvailableClients() {
  const {
    data: { clients = [] },
  } = useSuspenseQuery(getApiV1BetaDiscoveryClientsOptions())

  const installedClients = clients.filter(
    (client: ClientMcpClientStatus) => client.installed && client.client_type
  )

  /**
   * Get display name for a client
   */
  const getClientDisplayName = (clientType: string): string => {
    const displayNames: Record<string, string> = {
      vscode: 'VS Code - Copilot',
      cursor: 'Cursor',
      'claude-code': 'Claude Code',
      'vscode-insider': 'VS Code Insider',
      cline: 'Cline',
      'roo-code': 'Roo Code',
      windsurf: 'Windsurf',
      'windsurf-jetbrains': 'Windsurf JetBrains',
      'amp-cli': 'Amp CLI',
      'amp-vscode': 'Amp VS Code',
      'amp-cursor': 'Amp Cursor',
      'amp-vscode-insider': 'Amp VS Code Insider',
      'amp-windsurf': 'Amp Windsurf',
      'lm-studio': 'LM Studio',
      goose: 'Goose',
    }
    return displayNames[clientType] || clientType
  }

  /**
   * Get form field name for a client
   */
  const getClientFieldName = (clientType: string): string => {
    // Convert client_type to camelCase field name
    return `enable${clientType.charAt(0).toUpperCase()}${clientType.slice(1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`
  }

  return {
    installedClients,
    getClientDisplayName,
    getClientFieldName,
  }
}
