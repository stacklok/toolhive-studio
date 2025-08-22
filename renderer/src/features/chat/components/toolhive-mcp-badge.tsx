import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/common/components/ui/badge'
import { Info } from 'lucide-react'
import { ToolhiveMcpToolsModal } from './toolhive-mcp-tools-modal'

export function ToolhiveMcpBadge() {
  const [modalOpen, setModalOpen] = useState(false)

  // Fetch Toolhive MCP info
  const { data: toolhiveMcpInfo } = useQuery({
    queryKey: ['toolhive-mcp-info'],
    queryFn: () => window.electronAPI.chat.getToolhiveMcpInfo(),
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 0,
    refetchOnMount: true,
  })

  // Don't render if not available
  if (!toolhiveMcpInfo?.available || toolhiveMcpInfo.toolCount === 0) {
    return null
  }

  const handleBadgeClick = () => {
    setModalOpen(true)
  }

  return (
    <>
      <Badge
        variant="default"
        className="hover:bg-primary/90 group h-auto max-w-48 cursor-pointer px-2
          py-1 text-xs transition-colors duration-200"
        onClick={handleBadgeClick}
      >
        <span className="truncate font-medium">Toolhive MCP</span>
        <span className="ml-1.5 font-mono text-xs opacity-70">
          ({toolhiveMcpInfo.toolCount})
        </span>
        <Info
          className="ml-1.5 h-3 w-3 opacity-60 transition-opacity duration-200
            group-hover:opacity-90"
        />
      </Badge>

      {/* Toolhive MCP Tools Modal (Read-only) */}
      <ToolhiveMcpToolsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        toolhiveMcpInfo={toolhiveMcpInfo}
      />
    </>
  )
}
