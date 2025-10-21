import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { Copy } from 'lucide-react'
import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'
import { useGroups } from '../../../../hooks/use-groups'
import { useCopyServerToGroup } from '../../../../hooks/use-copy-server-to-group'
import { trackEvent } from '@/common/lib/analytics'

interface AddServerToGroupMenuItemProps {
  serverName: string
}

export function AddServerToGroupMenuItem({
  serverName,
}: AddServerToGroupMenuItemProps) {
  const prompt = usePrompt()
  const { data: groupsData } = useGroups()
  const { copyServerToGroup } = useCopyServerToGroup(serverName)

  const groups = groupsData?.groups ?? []

  const handleAddToGroup = async () => {
    const groupOptions = groups
      .filter((group) => group.name)
      .map((group) => ({
        value: group.name!,
        label: group.name!,
      }))

    if (groupOptions.length === 0) {
      return
    }

    const groupResult = await prompt(
      generateSimplePrompt({
        title: 'Copy server to a group',
        label: 'Select destination group',
        placeholder: 'Choose a group...',
        options: groupOptions,
      })
    )

    if (!groupResult) {
      trackEvent('Server copy cancelled', {
        cancelled_at: 'group_selection',
      })
      return // User cancelled
    }

    const groupName = groupResult.value
    const customName = `${serverName}-${groupName.replace(/\s+/g, '-')}`

    await copyServerToGroup(groupName, customName)
  }

  return (
    <DropdownMenuItem
      onClick={handleAddToGroup}
      className="flex cursor-pointer items-center"
    >
      <Copy className="mr-2 h-4 w-4" />
      Copy server to a group
    </DropdownMenuItem>
  )
}
