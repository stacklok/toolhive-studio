import type { ReactElement } from 'react'
import { Button } from '@/common/components/ui/button'
import { Plus } from 'lucide-react'
import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'
import { useMutationCreateGroup } from '@/features/mcp-servers/hooks/use-mutation-create-group'
import { doesAlreadyExist } from '@/common/lib/error-utils'

interface AddGroupButtonProps {
  apiGroups: Array<{ name?: string; registered_clients?: string[] }>
}

export function AddGroupButton({
  apiGroups,
}: AddGroupButtonProps): ReactElement {
  const prompt = usePrompt()
  const createGroupMutation = useMutationCreateGroup()

  const handleAddGroup = async (suggestedName = '') => {
    const result = await prompt({
      ...generateSimplePrompt({
        inputType: 'text',
        initialValue: suggestedName,
        title: 'Create a group',
        description: 'Enter a name for the new group.',
        placeholder: 'Enter group name...',
        label: 'Name',
      }),
      buttons: {
        confirm: 'Create',
        cancel: 'Cancel',
      },
    })

    if (result) {
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
