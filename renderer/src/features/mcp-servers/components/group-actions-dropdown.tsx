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
import { toast } from 'sonner'

export function GroupActionsDropdown({ groupName }: { groupName: string }) {
  const confirm = useConfirm()
  const { mutateAsync: deleteGroup } = useMutationDeleteGroup()
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
        data-group-name={groupName}
      >
        <DropdownMenuItem
          onClick={async () => {
            if (groupName === 'default') {
              toast.error('The default group cannot be deleted')
              return
            }
            const confirmed = await confirm(
              'Deleting this group will permanently erase all its servers. Are you sure you want to proceed? This action cannot be undone.',
              {
                title: 'Delete group',
                buttons: { yes: 'Delete', no: 'Cancel' },
                isDestructive: true,
              }
            )
            if (confirmed) {
              await deleteGroup({
                path: { name: groupName },
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
