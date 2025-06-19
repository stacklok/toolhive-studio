import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/common/components/ui/dropdown-menu'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

export function SecretDropdown({
  onHandleClick,
}: {
  onHandleClick: () => void
}) {
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
            Edit
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {}}
          className="flex cursor-pointer items-center"
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
