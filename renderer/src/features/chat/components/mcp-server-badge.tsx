import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/common/components/ui/badge'
import { Settings2 } from 'lucide-react'
import { McpToolsModal } from './mcp-tools-modal'
import { getNormalizedServerName } from '../lib/utils'

interface McpServerBadgeProps {
  serverName: string
  onToolsChange: () => void
}
// TODO: we are not using this at the moment, but better keep it here for now
export function McpServerBadge({
  serverName,
  onToolsChange,
}: McpServerBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false)

  // Fetch enabled tools for this specific server
  const { data: enabledMcpTools } = useQuery({
    queryKey: ['enabled-mcp-tools'],
    queryFn: () => window.electronAPI.chat.getEnabledMcpTools(),
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  // Helper function to get enabled tools count for this server
  const getEnabledToolsCount = (): number => {
    if (!enabledMcpTools) return 0
    const serverToolsList = enabledMcpTools[serverName] || []
    return serverToolsList.length
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
        className="group h-auto max-w-48 cursor-pointer"
        onClick={handleBadgeClick}
      >
        <span className="truncate">{getNormalizedServerName(serverName)}</span>
        <Badge variant="outline" className="bg-background/90 font-light">
          {getEnabledToolsCount()} tools
        </Badge>
        <Settings2 className="size-4" />
      </Badge>

      <McpToolsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        serverName={serverName}
        onToolsChange={handleToolsChange}
      />
    </>
  )
}
