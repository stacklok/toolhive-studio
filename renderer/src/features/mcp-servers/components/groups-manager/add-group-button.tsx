import type { ReactElement } from 'react'
import { Button } from '@/common/components/ui/button'
import { Plus } from 'lucide-react'
import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'
import { useMutationCreateGroup } from '@/features/mcp-servers/hooks/use-mutation-create-group'
import { z } from 'zod/v4'

interface AddGroupButtonProps {
  apiGroups: Array<{ name?: string; registered_clients?: string[] }>
}

export function AddGroupButton({
  apiGroups,
}: AddGroupButtonProps): ReactElement {
  const prompt = usePrompt()
  const createGroupMutation = useMutationCreateGroup()

  const handleAddGroup = async () => {
    const existingGroupNames = apiGroups.map((g) => g.name).filter(Boolean)

    const validationSchema = z
      .string()
      .min(1, 'Name is required')
      .regex(
        /^[a-z0-9_\-\s]+$/,
        'Group name can only contain lowercase letters, numbers, underscores, hyphens, and spaces'
      )
      .refine((name) => name === name.trim(), {
        message: 'Group name cannot have leading or trailing whitespace',
      })
      .refine((name) => !existingGroupNames.includes(name), {
        message: 'A group with this name already exists',
      })

    const result = await prompt({
      ...generateSimplePrompt({
        inputType: 'text',
        initialValue: '',
        title: 'Create a group',
        placeholder: 'Enter group name...',
        label: 'Name',
        validationSchema,
      }),
      buttons: {
        confirm: 'Create',
        cancel: 'Cancel',
      },
    })

    if (result && result.value) {
      try {
        await createGroupMutation.mutateAsync({
          body: {
            name: result.value,
          },
        })
      } catch (error) {
        console.error('Failed to create group:', error)
      }
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleAddGroup}
      className="flex h-9 w-[215px] items-center gap-2 px-4 py-2"
    >
      <Plus className="size-4" />
      Add a group
    </Button>
  )
}
