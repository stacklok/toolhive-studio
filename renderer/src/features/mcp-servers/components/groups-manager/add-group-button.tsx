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
    // Create a validation schema that rejects existing group names
    const existingGroupNames = apiGroups
      .map((g) => g.name?.toLowerCase())
      .filter(Boolean)

    const validationSchema = z
      .string()
      .min(1, 'Name is required')
      .refine((name) => !existingGroupNames.includes(name.toLowerCase()), {
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
