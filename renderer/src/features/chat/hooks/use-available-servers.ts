import { getApiV1BetaWorkloadsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import type { CoreWorkload } from '@common/api/generated/types.gen'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ChatMcpServer } from '../types'
import { TOOLHIVE_MCP_SERVER_NAME } from '../lib/constants'

export function useAvailableServers() {
  const queryClient = useQueryClient()

  const { data: workloadsData } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
    refetchInterval: 30000,
  })

  const { data: backendEnabledTools = [] } = useQuery({
    queryKey: ['chat', 'enabledMcpServers'],
    queryFn: () => window.electronAPI.chat.getEnabledMcpServersFromTools(),
    refetchInterval: 30000,
  })

  const { data: toolhiveMcpInfo } = useQuery({
    queryKey: ['toolhive-mcp-info'],
    queryFn: () => window.electronAPI.chat.getToolhiveMcpInfo(),
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 0,
    refetchOnMount: true,
  })

  // Process workloads data to get running MCP servers
  const installedMcpServers: ChatMcpServer[] = (workloadsData?.workloads || [])
    .filter((w: CoreWorkload) => w.status === 'running' && w.url)
    .map((w: CoreWorkload) => ({
      id: `mcp_${w.name}`,
      name: w.name || 'Unknown',
      status: w.status as 'running',
      package: w.package,
    }))

  const internalMcpServers: ChatMcpServer[] = toolhiveMcpInfo?.isRunning
    ? [
        {
          id: 'mcp_toolhive',
          name: TOOLHIVE_MCP_SERVER_NAME,
          status: 'running',
          package: 'toolhive-mcp',
        },
      ]
    : []

  const allAvailableMcpServer = [
    ...installedMcpServers,
    ...internalMcpServers,
  ].sort((a, b) => a.name.localeCompare(b.name))

  const enabledMcpServers = allAvailableMcpServer.filter((server) =>
    backendEnabledTools.includes(server.name)
  )

  const handleToolsChange = async () => {
    // Individual tool changes are already saved by the modal,
    // invalidate query to refetch latest state
    queryClient.invalidateQueries({ queryKey: ['chat', 'enabledMcpServers'] })
  }

  return {
    allAvailableMcpServer,
    backendEnabledTools,
    enabledMcpServers,
    handleToolsChange,
  }
}
