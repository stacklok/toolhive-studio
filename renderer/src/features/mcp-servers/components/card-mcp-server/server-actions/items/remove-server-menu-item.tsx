import { Trash2 } from 'lucide-react'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { useConfirm } from '@/common/hooks/use-confirm'
import { useDeleteServer } from '../../../../hooks/use-delete-server'

interface RemoveServerMenuItemProps {
  serverName: string
}

export function RemoveServerMenuItem({
  serverName,
}: RemoveServerMenuItemProps) {
  const confirm = useConfirm()
  const { mutateAsync: deleteServer, isPending: isDeletePending } =
    useDeleteServer({ name: serverName })

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (
      'nativeEvent' in e &&
      typeof e.nativeEvent.stopImmediatePropagation === 'function'
    ) {
      e.nativeEvent.stopImmediatePropagation()
    }

    const result = await confirm(
      `Are you sure you want to remove the server "${serverName}"?`,
      {
        title: 'Confirm Removal',
        isDestructive: true,
        buttons: { yes: 'Remove', no: 'Cancel' },
      }
    )

    if (result) {
      await deleteServer({ path: { name: serverName } })
    }
  }

  return (
    <DropdownMenuItem
      onClick={handleRemove}
      disabled={isDeletePending}
      className="flex cursor-pointer items-center"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Remove
    </DropdownMenuItem>
  )
}
