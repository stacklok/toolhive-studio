import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
import { Group } from './group'
import { Link, useRouterState } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import { usePrompt, generatePromptProps } from '@/common/hooks/use-prompt'
import { Plus } from 'lucide-react'
import { useMutationCreateGroup } from '@/features/mcp-servers/hooks/use-mutation-create-group'

export function GroupsManager(): ReactElement {
  const router = useRouterState({ select: (s) => s.location.search })
  const prompt = usePrompt()
  const createGroupMutation = useMutationCreateGroup()

  const { data } = useQuery({
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

  const apiGroups = data?.groups ?? []

  const currentGroupName = (router as Record<string, unknown>)['group']
    ? String((router as Record<string, string>)['group']).toLowerCase()
    : 'default'

  const handleAddGroup = async () => {
    const result = await prompt(
      generatePromptProps('text', '', {
        title: 'Create a group',
        label: 'Name',
        placeholder: 'Enter group name...',
        required: true,
        minLength: 1,
        maxLength: 50,
        confirmText: 'Create',
        cancelText: 'Cancel',
      })
    )

    if (result) {
      createGroupMutation.mutate({
        body: {
          name: result.value,
        },
      })
    }
  }

  return (
    <div className="space-y-2">
      {apiGroups.map((group, index) => (
        <Link
          key={group.name ?? `group-${index + 1}`}
          to="/"
          search={(prev) => ({
            ...prev,
            group: (group.name ?? 'default').toLowerCase(),
          })}
          preload={false}
        >
          <Group
            name={group.name ?? 'default'}
            isEnabled={Boolean(
              group.registered_clients && group.registered_clients.length > 0
            )}
            isActive={(group.name ?? '').toLowerCase() === currentGroupName}
          />
        </Link>
      ))}

      <Button
        variant="outline"
        onClick={handleAddGroup}
        className="flex h-9 w-[215px] items-center gap-2 px-4 py-2"
      >
        <Plus className="size-4" />
        Add a group
      </Button>
    </div>
  )
}
