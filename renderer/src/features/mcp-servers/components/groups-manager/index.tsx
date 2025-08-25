import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
import { Group } from './group'
import { Link, useRouterState } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import { usePrompt } from '@/common/hooks/use-prompt'
import { Plus } from 'lucide-react'

export function GroupsManager(): ReactElement {
  const router = useRouterState({ select: (s) => s.location.search })
  const prompt = usePrompt()

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
    const groupName = await prompt('Name', {
      title: 'Create a group',
      placeholder: 'Enter group name...',
      buttons: {
        confirm: 'Create',
        cancel: 'Cancel',
      },
      validation: {
        required: true,
        minLength: 1,
      },
    })

    if (groupName) {
      // TODO: Implement actual group creation API call
      console.log('Creating group:', groupName)
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
