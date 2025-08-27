import type { ReactElement } from 'react'
import { Button } from '@/common/components/ui/button'
import { Plus } from 'lucide-react'
import { usePrompt } from '@/common/hooks/use-prompt'
import { useMutationCreateGroup } from '@/features/mcp-servers/hooks/use-mutation-create-group'
import type { FormikFormPromptConfig } from '@/common/contexts/prompt'
import type { FormikProps } from 'formik'
import { Input } from '@/common/components/ui/input'
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
        if (doesAlreadyExist(error)) {
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
