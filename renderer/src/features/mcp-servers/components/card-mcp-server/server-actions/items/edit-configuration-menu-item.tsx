import { Settings } from 'lucide-react'
import { useState } from 'react'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { WrapperDialogFormMcp } from '../../../wrapper-dialog-mcp'
import { getApiV1BetaWorkloadsByNameOptions } from '@api/@tanstack/react-query.gen'
import { useQuery } from '@tanstack/react-query'

interface EditConfigurationMenuItemProps {
  serverName: string
}

export function EditConfigurationMenuItem({
  serverName,
}: EditConfigurationMenuItemProps) {
  const [serverDialogOpen, setServerDialogOpen] = useState<{
    local: boolean
    remote: boolean
  }>({
    local: false,
    remote: false,
  })

  const { data: serverData, isLoading: isLoadingServer } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: serverName || '' },
    }),
  })

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    const isRemote = !!serverData?.url

    setServerDialogOpen({ local: !isRemote, remote: isRemote })
  }

  return (
    <>
      <DropdownMenuItem asChild className="flex cursor-pointer items-center">
        <a className="self-start" onClick={handleEdit}>
          <Settings className="mr-2 h-4 w-4" />
          Edit configuration
        </a>
      </DropdownMenuItem>

      {!isLoadingServer && (
        <WrapperDialogFormMcp
          serverType={serverDialogOpen}
          closeDialog={() =>
            setServerDialogOpen({ local: false, remote: false })
          }
          serverToEdit={serverName}
        />
      )}
    </>
  )
}
