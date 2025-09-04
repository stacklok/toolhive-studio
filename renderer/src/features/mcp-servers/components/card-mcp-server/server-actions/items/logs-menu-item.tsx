import { Text } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'

interface LogsMenuItemProps {
  serverName: string
}

export function LogsMenuItem({ serverName }: LogsMenuItemProps) {
  return (
    <DropdownMenuItem asChild className="flex cursor-pointer items-center">
      <Link to="/logs/$serverName" params={{ serverName }}>
        <Text className="mr-2 h-4 w-4" />
        Logs
      </Link>
    </DropdownMenuItem>
  )
}
