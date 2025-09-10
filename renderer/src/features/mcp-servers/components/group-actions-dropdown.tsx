import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/common/components/ui/dropdown-menu'
import { MoreVertical, Trash2 } from 'lucide-react'
import { useConfirm } from '@/common/hooks/use-confirm'
import { useMutationDeleteGroup } from '../hooks/use-mutation-delete-group'

export function GroupActionsDropdown({
  groupName: _groupName,
}: {
  groupName: string
}) {
  const confirm = useConfirm()
  const { mutateAsync: deleteGroup } = useMutationDeleteGroup()
  // For now, only render the menu with a Delete action placeholder.
  // Actual delete logic will be implemented later.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Options"
          className="ml-2"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        role="menu"
        className="w-56"
        data-group-name={_groupName}
      >
        <DropdownMenuItem
          onClick={async () => {
            const confirmed = await confirm(
              'Deleting this group will permanently erase all it’s servers. Are you sure you want to proceed? This action cannot be undone.',
              {
                title: 'Delete group',
                buttons: { yes: 'Delete', no: 'Cancel' },
                isDestructive: true,
              }
            )
            if (confirmed) {
              await deleteGroup({
                path: { name: _groupName },
                query: { 'with-workloads': true },
              })
            }
          }}
          className="flex cursor-pointer items-center"
        >
          <Trash2 className="mr-2 size-4" />
          Delete group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
