import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { Copy } from 'lucide-react'
import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../../../../utils/feature-flags'
import { useGroups } from '../../../../hooks/use-groups'
import { useCopyServerToGroup } from '../../../../hooks/use-copy-server-to-group'

interface AddServerToGroupMenuItemProps {
  serverName: string
}

export function AddServerToGroupMenuItem({
  serverName,
}: AddServerToGroupMenuItemProps) {
  const prompt = usePrompt()
  const isGroupsEnabled = useFeatureFlag(featureFlagKeys.GROUPS)
  const { data: groupsData } = useGroups()
  const { copyServerToGroup } = useCopyServerToGroup(serverName)

  if (!isGroupsEnabled) {
    return null
  }

  const handleAddToGroup = async () => {
    const groups = groupsData?.groups ?? []

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
      return // User cancelled
    }

    const groupName = groupResult.value
    const customName = `${serverName}-${groupName}`

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
