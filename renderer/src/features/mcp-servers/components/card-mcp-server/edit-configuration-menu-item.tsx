import { Settings } from 'lucide-react'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'

interface EditConfigurationMenuItemProps {
  serverName: string
  onEdit: (serverName: string) => void
}

export function EditConfigurationMenuItem({
  serverName,
  onEdit,
}: EditConfigurationMenuItemProps) {
  return (
    <DropdownMenuItem asChild className="flex cursor-pointer items-center">
      <a className="self-start" onClick={() => onEdit(serverName)}>
        <Settings className="mr-2 h-4 w-4" />
        Edit configuration
      </a>
    </DropdownMenuItem>
  )
}
