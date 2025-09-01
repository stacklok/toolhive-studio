import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { Copy } from 'lucide-react'
import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
import { useMutationUpdateWorkloadGroup } from '../hooks/use-mutation-update-workload-group'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'

interface AddServerToGroupMenuItemProps {
  serverName: string
}

export function AddServerToGroupMenuItem({
  serverName,
}: AddServerToGroupMenuItemProps) {
  const prompt = usePrompt()
  const updateGroupMutation = useMutationUpdateWorkloadGroup()
  const isGroupsEnabled = useFeatureFlag(featureFlagKeys.GROUPS)

  // Fetch available groups
  const { data: groupsData } = useQuery({
    queryKey: ['api', 'v1beta', 'groups'],
    queryFn: async () => {
      const response = await getApiV1BetaGroups({
        parseAs: 'text',
        responseStyle: 'data',
      })
      const parsed =
        typeof response === 'string' ? JSON.parse(response) : response
      return parsed as {
        groups?: Array<{ name?: string; registered_clients?: string[] }>
      }
    },
    staleTime: 5_000,
  })

  // Don't render if groups feature is disabled
  if (!isGroupsEnabled) {
    return null
  }

  const handleAddToGroup = async () => {
    const groups = groupsData?.groups ?? []

    // Filter out the current group if the server is already in a group
    // For now, we'll show all groups and let the backend handle duplicates
    const groupOptions = groups
      .filter((group) => group.name) // Only include groups with names
      .map((group) => ({
        value: group.name!,
        label: group.name!,
      }))

    if (groupOptions.length === 0) {
      // No groups available, could show a message or create a group
      return
    }

    const result = await prompt(
      generateSimplePrompt({
        title: 'Add server to a group',
        label: 'Select destination group',
        placeholder: 'Choose a group...',
        options: groupOptions,
      })
    )

    if (result) {
      try {
        await updateGroupMutation.mutateAsync({
          workloadName: serverName,
          groupName: result.value,
        })
      } catch (error) {
        console.error('Failed to move server to group:', error)
      }
    }
  }

  return (
    <DropdownMenuItem
      onClick={handleAddToGroup}
      className="flex cursor-pointer items-center"
    >
      <Copy className="mr-2 h-4 w-4" />
      Add server to a group
    </DropdownMenuItem>
  )
}
