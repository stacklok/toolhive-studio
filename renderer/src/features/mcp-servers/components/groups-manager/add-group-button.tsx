import type { ReactElement } from 'react'
import { Button } from '@/common/components/ui/button'
import { Plus } from 'lucide-react'
import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'
import { useMutationCreateGroup } from '@/features/mcp-servers/hooks/use-mutation-create-group'
import { doesAlreadyExist } from '@/common/lib/error-utils'
import { z } from 'zod/v4'

interface AddGroupButtonProps {
  apiGroups: Array<{ name?: string; registered_clients?: string[] }>
}

export function AddGroupButton({
  apiGroups,
}: AddGroupButtonProps): ReactElement {
  const prompt = usePrompt()
  const createGroupMutation = useMutationCreateGroup()

  const handleAddGroup = async (suggestedName = '') => {
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
        initialValue: suggestedName,
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
        if (doesAlreadyExist(error)) {
          const originalName = result.value
          const existingGroups = apiGroups.map((g) => g.name?.toLowerCase())
          let suggestion = originalName
          let counter = 2

          while (existingGroups.includes(suggestion.toLowerCase())) {
            suggestion = `${originalName}-${counter}`
            counter++
          }

          await handleAddGroup(suggestion)
        } else {
          console.error('Failed to create group:', error)
        }
      }
    }
  }

  return (
    <Button
      variant="outline"
      onClick={() => handleAddGroup()}
      className="flex h-9 w-[215px] items-center gap-2 px-4 py-2"
    >
      <Plus className="size-4" />
      Add a group
    </Button>
  )
}
