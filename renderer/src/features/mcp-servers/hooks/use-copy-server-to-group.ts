import { useTransition } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod/v4'
import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'
import {
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsQueryKey,
} from '@api/@tanstack/react-query.gen'
import { getApiV1BetaWorkloadsByName } from '@api/sdk.gen'
import { trackEvent } from '@/common/lib/analytics'

async function ensureUniqueName(
  prompt: ReturnType<typeof usePrompt>,
  {
    initialValue,
    rejectedName,
  }: {
    initialValue: string
    rejectedName: string | null
  }
): Promise<string | null> {
  const validationSchema = z
    .string()
    .min(1, 'Name is required')
    .refine((name) => name !== rejectedName, {
      message: 'This name is already taken. Please choose another name.',
    })

  const nameResult = await prompt({
    ...generateSimplePrompt({
      inputType: 'text',
      initialValue,
      title: 'Copy server to a group',
      placeholder: 'Enter server name...',
      label: 'Name',
      validationSchema,
    }),
    buttons: {
      confirm: 'OK',
      cancel: 'Cancel',
    },
    // Show validation error immediately if we're retrying after a conflict
    validateOnMount: rejectedName !== null,
  })

  if (!nameResult) {
    return null
  }

  return nameResult.value
}

export function useCopyServerToGroup(serverName: string) {
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
  })

  const copyServerToGroup = (groupName: string, customName: string): void => {
    startTransition(async () => {
      let lastRejectedName: string | null = null
      let currentName = customName
      let toastId: string | number | undefined
      let retryCount = 0
      let cancelledAt: 'group_selection' | 'name_conflict_resolution' | null =
        null

      const attemptCreateWorkload = async (): Promise<boolean> => {
        if (lastRejectedName !== null) {
          const userProvidedName = await ensureUniqueName(prompt, {
            initialValue: currentName,
            rejectedName: lastRejectedName,
          })

          if (!userProvidedName) {
            cancelledAt = 'name_conflict_resolution'
            return false
          }

          currentName = userProvidedName
          retryCount++
        }

        try {
          const { data: runConfig } = await getApiV1BetaWorkloadsByName({
            path: { name: serverName },
            throwOnError: true,
          })

          const secrets = runConfig.secrets || []

          toastId = toast.loading('Copying server to group...')

          const isRemoteServer = !!runConfig.url

          await createWorkload({
            body: {
              name: currentName,
              ...(isRemoteServer
                ? {
                    url: runConfig.url,
                    oauth_config: runConfig.oauth_config,
                  }
                : {
                    image: runConfig.image,
                    volumes: runConfig.volumes,
                    cmd_arguments: runConfig.cmd_arguments,
                  }),
              transport: runConfig.transport,
              env_vars: runConfig.env_vars,
              secrets: secrets,
              network_isolation: runConfig.network_isolation,
              permission_profile: runConfig.permission_profile,
              host: runConfig.host,
              target_port: runConfig.target_port,
              group: groupName,
            },
          })

          await queryClient.invalidateQueries({
            queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
          })

          toast.success(
            `Server "${serverName}" copied to group "${groupName}" successfully`,
            { id: toastId }
          )

          trackEvent('Server copied to group', {
            destination_is_default_group: String(groupName === 'default'),
            transport: runConfig.transport || 'unknown',
            retry_count: retryCount,
          })

          return false
        } catch (error: unknown) {
          const errorMessage = String(error)
          const is409 = errorMessage.toLowerCase().includes('already exists')

          if (is409) {
            if (toastId) {
              toast.dismiss(toastId)
            }
            lastRejectedName = currentName
            return true
          }

          if (toastId) {
            toast.dismiss(toastId)
          }
          toast.error(
            errorMessage ||
              'An unexpected error occurred while copying the server to the group'
          )
          return false
        }
      }

      while (await attemptCreateWorkload()) {
        // Retry on name conflict unless user cancelled or another error happened
      }

      if (cancelledAt) {
        trackEvent('Server copy cancelled', {
          cancelled_at: cancelledAt,
        })
      }
    })
  }

  return {
    copyServerToGroup,
    isPending,
  }
}
