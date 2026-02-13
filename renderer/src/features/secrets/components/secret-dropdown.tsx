import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/common/components/ui/dropdown-menu'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useMutationDeleteSecret } from '../hooks/use-mutation-delete-secret'
import { useConfirm } from '@/common/hooks/use-confirm'

export function SecretDropdown({
  onHandleClick,
  secretKey,
}: {
  onHandleClick: () => void
  secretKey: string
}) {
  const confirm = useConfirm()
  const { mutateAsync: deleteSecret, isPending: isDeletePending } =
    useMutationDeleteSecret(secretKey)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()

    const confirmed = await confirm(
      "Deleting this secret will permanently erase it's contents. Are you sure you want to proceed? This action cannot be undone.",
      {
        title: 'Delete secret',
        isDestructive: true,
        buttons: { yes: 'Delete', no: 'Cancel' },
      }
    )

    if (confirmed) {
      await deleteSecret({
        path: {
          key: secretKey,
        },
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Secret options"
          className="ml-2 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" role="menu">
        <DropdownMenuItem asChild>
          <div
            className="flex cursor-pointer items-center"
            onClick={onHandleClick}
          >
            <Pencil className="mr-2 size-4" />
            Update secret
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isDeletePending}
          className="flex cursor-pointer items-center"
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
