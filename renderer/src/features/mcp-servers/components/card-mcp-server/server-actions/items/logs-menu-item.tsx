import { Text } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'

interface LogsMenuItemProps {
  serverName: string
  remote: boolean
  groupName: string
}

export function LogsMenuItem({ serverName, remote, groupName }: LogsMenuItemProps) {
  return (
    <DropdownMenuItem
      asChild
      className="flex cursor-pointer items-center"
      disabled={remote}
    >
      <Link to="/logs/$groupName/$serverName" params={{ serverName, groupName }}>
        <Text className="mr-2 h-4 w-4" />
        Logs
      </Link>
    </DropdownMenuItem>
  )
}
