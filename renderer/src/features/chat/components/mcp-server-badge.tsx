import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/common/components/ui/badge'
import { Settings } from 'lucide-react'
import { McpToolsModal } from './mcp-tools-modal'

interface McpServerBadgeProps {
  serverName: string
  onToolsChange: () => void
}

export function McpServerBadge({
  serverName,
  onToolsChange,
}: McpServerBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false)

  // Fetch enabled tools for this specific server
  const { data: enabledMcpTools } = useQuery({
    queryKey: ['enabled-mcp-tools'],
    queryFn: () => window.electronAPI.chat.getEnabledMcpTools(),
    refetchInterval: 2000, // Refresh every 2 seconds to keep counts updated
  })

  // Fetch server tools data to get total count
  const { data: serverTools } = useQuery({
    queryKey: ['mcp-server-tools', serverName],
    queryFn: () => window.electronAPI.chat.getMcpServerTools(serverName),
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 0,
    refetchOnMount: true,
  })

  // Helper function to get enabled tools count for this server
  const getEnabledToolsCount = (): number => {
    if (!enabledMcpTools) return 0
    const serverToolsList = enabledMcpTools[serverName] || []
    return serverToolsList.length
  }

  // Helper function to format the badge counter
  const formatBadgeCounter = (): string => {
    const enabledCount = getEnabledToolsCount()
    const totalCount = serverTools?.tools?.length || 0

    if (totalCount === 0) {
      return '(0)'
    }

    // If all tools are enabled, just show the count
    if (enabledCount === totalCount) {
      return `(${enabledCount})`
    }

    // If not all tools are enabled, show enabled/total
    return `(${enabledCount}/${totalCount})`
  }

  const handleBadgeClick = () => {
    setModalOpen(true)
  }

  const handleToolsChange = () => {
    onToolsChange()
  }

  return (
    <>
      <Badge
        variant="secondary"
        className="hover:bg-secondary/80 group h-auto max-w-48 cursor-pointer
          px-2 py-1 text-xs transition-colors duration-200"
        onClick={handleBadgeClick}
      >
        <span className="truncate font-medium">{serverName}</span>
        <span className="ml-1.5 font-mono text-xs opacity-60">
          {formatBadgeCounter()}
        </span>
        <Settings
          className="ml-1.5 h-3 w-3 opacity-50 transition-opacity duration-200
            group-hover:opacity-80"
        />
      </Badge>

      {/* MCP Tools Modal */}
      <McpToolsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        serverName={serverName}
        onToolsChange={handleToolsChange}
      />
    </>
  )
}
