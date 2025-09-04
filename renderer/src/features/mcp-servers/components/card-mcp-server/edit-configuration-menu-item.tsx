import { Settings } from 'lucide-react'
import { useState } from 'react'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { DeprecatedDialogFormRunMcpServerWithCommand } from '../dialog-form-run-mcp-command'

interface EditConfigurationMenuItemProps {
  serverName: string
}

export function EditConfigurationMenuItem({
  serverName,
}: EditConfigurationMenuItemProps) {
  const [isRunWithCommandOpen, setIsRunWithCommandOpen] = useState(false)

  const handleEdit = () => {
    setIsRunWithCommandOpen(true)
  }

  return (
    <>
      <DropdownMenuItem asChild className="flex cursor-pointer items-center">
        <a className="self-start" onClick={handleEdit}>
          <Settings className="mr-2 h-4 w-4" />
          Edit configuration
        </a>
      </DropdownMenuItem>

      <DeprecatedDialogFormRunMcpServerWithCommand
        isOpen={isRunWithCommandOpen}
        onOpenChange={setIsRunWithCommandOpen}
        serverToEdit={serverName}
      />
    </>
  )
}
