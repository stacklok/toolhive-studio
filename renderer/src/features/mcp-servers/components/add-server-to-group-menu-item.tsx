import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { FolderPlus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'

interface AddServerToGroupMenuItemProps {
  serverName: string
}

export function AddServerToGroupMenuItem({
  serverName,
}: AddServerToGroupMenuItemProps) {
  const prompt = usePrompt()

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
        buttons: {
          confirm: 'Copy',
          cancel: 'Cancel',
        },
      })
    )

    if (result) {
      // TODO: Implement the actual API call to add server to group
      console.log(`Adding server ${serverName} to group ${result.value}`)
      // For now, just show a success message
      // toast.success(`Server added to group "${result.value}"`)
    }
  }

  return (
    <DropdownMenuItem
      onClick={handleAddToGroup}
      className="flex cursor-pointer items-center"
    >
      <FolderPlus className="mr-2 h-4 w-4" />
      Add server to a group
    </DropdownMenuItem>
  )
}
