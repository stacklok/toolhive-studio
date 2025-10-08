import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { Copy } from 'lucide-react'
import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../../../../utils/feature-flags'
import { useGroups } from '../../../../hooks/use-groups'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postApiV1BetaWorkloadsMutation } from '@api/@tanstack/react-query.gen'
import { getApiV1BetaWorkloadsByNameExport } from '@api/sdk.gen'
import { getApiV1BetaWorkloadsQueryKey } from '@api/@tanstack/react-query.gen'

interface AddServerToGroupMenuItemProps {
  serverName: string
}

export function AddServerToGroupMenuItem({
  serverName,
}: AddServerToGroupMenuItemProps) {
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const isGroupsEnabled = useFeatureFlag(featureFlagKeys.GROUPS)

  const { data: groupsData } = useGroups()

  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
  })

  if (!isGroupsEnabled) {
    return null
  }

  const handleAddToGroup = async () => {
    const groups = groupsData?.groups ?? []

    const groupOptions = groups
      .filter((group) => group.name)
      .map((group) => ({
        value: group.name!,
        label: group.name!,
      }))

    if (groupOptions.length === 0) {
      return
    }

    // First prompt: Select destination group
    const groupResult = await prompt(
      generateSimplePrompt({
        title: 'Copy server to a group',
        label: 'Select destination group',
        placeholder: 'Choose a group...',
        options: groupOptions,
      })
    )

    if (!groupResult) {
      return // User cancelled
    }

    const groupName = groupResult.value

    // Track names that have been rejected by the API
    const rejectedNames = new Set<string>()
    const maxAttempts = 5
    let attemptCount = 0

    while (attemptCount < maxAttempts) {
      attemptCount++

      // Prompt for name with validation against rejected names
      const validationSchema = z
        .string()
        .min(1, 'Name is required')
        .refine((name) => !rejectedNames.has(name), {
          message: 'This name is already taken. Please choose another name.',
        })

      const nameResult = await prompt({
        ...generateSimplePrompt({
          inputType: 'text',
          initialValue: `${serverName}-${groupName}`,
          title: 'Copy server to a group',
          placeholder: 'Enter server name...',
          label: 'Name',
          validationSchema,
        }),
        buttons: {
          confirm: 'OK',
          cancel: 'Cancel',
        },
      })

      if (!nameResult) {
        return // User cancelled
      }

      const customName = nameResult.value

      try {
        // Fetch server configuration
        const { data: runConfig } = await getApiV1BetaWorkloadsByNameExport({
          path: { name: serverName },
          throwOnError: true,
        })

        const secrets = (runConfig.secrets || []).map((secretStr) => {
          const [secretName, target] = secretStr.split(',target=')

          return {
            name: secretName,
            target: target,
          }
        })

        // Show loading toast only on first attempt
        let toastId: string | number | undefined
        if (attemptCount === 1) {
          toastId = toast.loading('Copying server to group...')
        }

        // Don't use throwOnError so we can check the status code
        const response = await createWorkload({
          body: {
            name: customName,
            image: runConfig.image,
            transport: runConfig.transport,
            cmd_arguments: runConfig.cmd_args || [],
            env_vars: runConfig.env_vars || {},
            secrets: secrets,
            volumes: runConfig.volumes || [],
            network_isolation: runConfig.isolate_network || false,
            permission_profile: runConfig.permission_profile,
            host: runConfig.host,
            target_port: runConfig.target_port,
            group: groupName,
          },
        }).catch((error) => {
          // Re-throw with status code attached if possible
          throw { ...error, _rawError: error }
        })

        // Success! Invalidate queries and show success toast
        await queryClient.invalidateQueries({
          queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
        })

        if (toastId) {
          toast.success(
            `Server "${serverName}" copied to group "${groupName}" successfully`,
            { id: toastId }
          )
        } else {
          toast.success(
            `Server "${serverName}" copied to group "${groupName}" successfully`
          )
        }
        return
      } catch (error: unknown) {
        // The API returns plain text for 409 errors, not JSON
        // Error can be a string directly or an object with the string inside
        let errorMessage: string

        if (typeof error === 'string') {
          errorMessage = error
        } else if (error && typeof error === 'object') {
          const errorObj = error as {
            detail?: string
            message?: string
            error?: string
            _rawError?: string
          }
          errorMessage =
            errorObj._rawError ||
            errorObj.detail ||
            errorObj.message ||
            errorObj.error ||
            'Failed to copy server to group'
        } else {
          errorMessage = 'Failed to copy server to group'
        }

        // Check if it's a 409 conflict error based on the error message
        const is409 =
          errorMessage.toLowerCase().includes('already exists') ||
          errorMessage.toLowerCase().includes('already taken') ||
          errorMessage.toLowerCase().includes('conflict')

        if (is409 && attemptCount < maxAttempts) {
          // Add this name to the rejected list so validation will catch it
          rejectedNames.add(customName)
          // Dismiss any existing toasts
          toast.dismiss()
          // Continue to next iteration to re-prompt
          continue
        } else if (is409) {
          // Max attempts reached
          toast.error(
            'Unable to copy server after multiple attempts. Please try a different name.'
          )
          return
        } else {
          // Other error - show error message and exit
          toast.error(errorMessage)
          return
        }
      }
    }
  }

  return (
    <DropdownMenuItem
      onClick={handleAddToGroup}
      className="flex cursor-pointer items-center"
    >
      <Copy className="mr-2 h-4 w-4" />
      Copy server to a group
    </DropdownMenuItem>
  )
}
