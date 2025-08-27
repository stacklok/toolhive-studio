import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
import { Group } from './group'
import { Link, useRouterState } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import { usePrompt } from '@/common/hooks/use-prompt'
import { Plus } from 'lucide-react'
import { useMutationCreateGroup } from '@/features/mcp-servers/hooks/use-mutation-create-group'
import type { FormikFormPromptConfig } from '@/common/contexts/prompt'
import type { FormikProps } from 'formik'
import { Input } from '@/common/components/ui/input'

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
    const promptConfig: FormikFormPromptConfig<{ value: string }> = {
      title: 'Create a group',
      description: 'Enter a name for the new group.',
      initialValues: { value: suggestedName },
      fields: (formik: FormikProps<{ value: string }>) => (
        <div className="space-y-4">
          <div>
            <label htmlFor="value" className="mb-2 block text-sm font-medium">
              Name
            </label>
            <Input
              id="value"
              type="text"
              placeholder="Enter group name..."
              {...formik.getFieldProps('value')}
            />
            {formik.touched.value && formik.errors.value && (
              <p className="mt-1 text-sm text-red-500">{formik.errors.value}</p>
            )}
          </div>
        </div>
      ),
      buttons: {
        confirm: 'Create',
        cancel: 'Cancel',
      },
    }

    const result = await prompt(promptConfig)

    if (result) {
      try {
        await createGroupMutation.mutateAsync({
          body: {
            name: result.value,
          },
        })
      } catch (error) {
        const is409Error =
          // String errors (what we actually get from the API)
          (typeof error === 'string' &&
            (error.includes('409') ||
              error.toLowerCase().includes('already exists'))) ||
          // Object errors with status property
          (error &&
            typeof error === 'object' &&
            'status' in error &&
            (error as { status: number }).status === 409)

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
