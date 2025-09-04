import { Edit3 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { cn } from '@/common/lib/utils'

interface CustomizeToolsMenuItemProps {
  serverName: string
  status: string | undefined
}

export function CustomizeToolsMenuItem({
  serverName,
  status,
}: CustomizeToolsMenuItemProps) {
  const isRunning = status === 'running'

  return (
    <DropdownMenuItem asChild className="flex cursor-pointer items-center">
      <Link
        disabled={!isRunning}
        className={cn(!isRunning && 'pointer-events-none opacity-50')}
        to="/customize-tools/$serverName"
        params={{ serverName }}
      >
        <Edit3 className="mr-2 h-4 w-4" />
        Customize Tools
      </Link>
    </DropdownMenuItem>
  )
}
