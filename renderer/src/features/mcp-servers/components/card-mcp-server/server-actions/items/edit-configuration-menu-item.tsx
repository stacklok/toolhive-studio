import { Settings } from 'lucide-react'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { getApiV1BetaWorkloadsByNameOptions } from '@api/@tanstack/react-query.gen'
import { useQuery } from '@tanstack/react-query'
import { useEditServerDialog } from '../../../../hooks/use-edit-server-dialog'

interface EditConfigurationMenuItemProps {
  serverName: string
}

export function EditConfigurationMenuItem({
  serverName,
}: EditConfigurationMenuItemProps) {
  const { openDialog } = useEditServerDialog()

  const { data: serverData } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: serverName || '' },
    }),
  })

  const handleEdit = () => {
    if (!serverData?.group) return
    const isRemote = !!serverData?.url
    openDialog(serverName, isRemote, serverData.group)
  }

  return (
    <DropdownMenuItem asChild className="flex cursor-pointer items-center">
      <a className="self-start" onClick={handleEdit}>
        <Settings className="mr-2 h-4 w-4" />
        Edit configuration
      </a>
    </DropdownMenuItem>
  )
}
