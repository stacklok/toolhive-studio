import { Activity } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'

interface InspectorMenuItemProps {
  serverName: string
  status: string | undefined
}

export function InspectorMenuItem({
  serverName,
  status,
}: InspectorMenuItemProps) {
  const isRunning = status === 'running'

  return (
    <DropdownMenuItem
      asChild
      className="flex cursor-pointer items-center"
      disabled={!isRunning}
    >
      <Link to="/inspector" search={{ serverName }}>
        <Activity className="mr-2 h-4 w-4" />
        Inspector
      </Link>
    </DropdownMenuItem>
  )
}
