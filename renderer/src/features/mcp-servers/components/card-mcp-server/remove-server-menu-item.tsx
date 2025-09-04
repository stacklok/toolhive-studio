import { Trash2 } from 'lucide-react'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'

interface RemoveServerMenuItemProps {
  onRemove: (e: React.MouseEvent) => void
  isDeletePending: boolean
}

export function RemoveServerMenuItem({
  onRemove,
  isDeletePending,
}: RemoveServerMenuItemProps) {
  return (
    <DropdownMenuItem
      onClick={onRemove}
      disabled={isDeletePending}
      className="flex cursor-pointer items-center"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Remove
    </DropdownMenuItem>
  )
}
