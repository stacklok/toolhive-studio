import { ArrowUpCircle } from 'lucide-react'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { useUpdateVersion } from '../../../../hooks/use-update-version'

interface UpdateVersionMenuItemProps {
  serverName: string
  registryImage: string
  localTag: string
  registryTag: string
  disabled?: boolean
}

export function UpdateVersionMenuItem({
  serverName,
  registryImage,
  localTag,
  registryTag,
  disabled,
}: UpdateVersionMenuItemProps) {
  const { promptUpdate, isReady } = useUpdateVersion({
    serverName,
    registryImage,
    localTag,
    registryTag,
  })

  const handleUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (
      'nativeEvent' in e &&
      typeof e.nativeEvent.stopImmediatePropagation === 'function'
    ) {
      e.nativeEvent.stopImmediatePropagation()
    }
    await promptUpdate()
  }

  return (
    <DropdownMenuItem
      onClick={handleUpdate}
      disabled={disabled || !isReady}
      className="flex cursor-pointer items-center"
    >
      <ArrowUpCircle className="mr-2 h-4 w-4" />
      Update to {registryTag}
    </DropdownMenuItem>
  )
}
