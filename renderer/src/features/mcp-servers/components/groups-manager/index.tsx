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

  const handleAddGroup = async (suggestedName = '') => {
    const result = await prompt(
      generatePromptProps('text', suggestedName, {
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
      try {
        await createGroupMutation.mutateAsync({
          body: {
            name: result.value,
          },
        })
      } catch (error) {
        // Check if it's a conflict error and offer to retry - handle multiple error structures
        const is409Error =
          // String errors (what we actually get from the API)
          (typeof error === 'string' &&
            (error.includes('409') ||
              error.toLowerCase().includes('already exists') ||
              error.toLowerCase().includes('group_already_exists'))) ||
          // Object errors (fallback for other possible structures)
          (error &&
            typeof error === 'object' &&
            // Direct status property
            (('status' in error &&
              (error as { status: number }).status === 409) ||
              // Response object with status
              ('response' in error &&
                (error as { response: { status?: unknown } }).response
                  ?.status === 409) ||
              // Check error message for 409
              (error instanceof Error && error.message.includes('409')) ||
              // Check plain object message for 409
              ('message' in error &&
                typeof (error as { message: unknown }).message === 'string' &&
                (error as { message: string }).message.includes('409')) ||
              // Check error message for conflict indication
              (error instanceof Error &&
                error.message.toLowerCase().includes('already exists')) ||
              ('message' in error &&
                typeof (error as { message: unknown }).message === 'string' &&
                (error as { message: string }).message
                  .toLowerCase()
                  .includes('already exists'))))

        if (is409Error) {
          // Generate a suggested alternative name
          const originalName = result.value
          const existingGroups = apiGroups.map((g) => g.name?.toLowerCase())
          let suggestion = originalName
          let counter = 2

          while (existingGroups.includes(suggestion.toLowerCase())) {
            suggestion = `${originalName}-${counter}`
            counter++
          }

          // Recursively call handleAddGroup with the suggested name
          await handleAddGroup(suggestion)
        } else {
          // Other errors are handled by useToastMutation
          console.error('Failed to create group:', error)
        }
      }
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
        onClick={() => handleAddGroup()}
        className="flex h-9 w-[215px] items-center gap-2 px-4 py-2"
      >
        <Plus className="size-4" />
        Add a group
      </Button>
    </div>
  )
}
