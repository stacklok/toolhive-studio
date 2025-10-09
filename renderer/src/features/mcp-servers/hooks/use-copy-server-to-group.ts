import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod/v4'
import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'
import {
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsQueryKey,
} from '@api/@tanstack/react-query.gen'
import { getApiV1BetaWorkloadsByNameExport } from '@api/sdk.gen'

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
  const [isProcessing, setIsProcessing] = useState(false)

  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
  })

  const copyServerToGroup = async (
    groupName: string,
    customName: string
  ): Promise<boolean> => {
    setIsProcessing(true)
    let lastRejectedName: string | null = null
    let currentName = customName
    let toastId: string | number | undefined

    const attemptCreateWorkload = async (): Promise<boolean> => {
      if (lastRejectedName !== null) {
        const userProvidedName = await ensureUniqueName(prompt, {
          initialValue: currentName,
          rejectedName: lastRejectedName,
        })

        if (!userProvidedName) {
          return false
        }

        currentName = userProvidedName
      }

      try {
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

        toastId = toast.loading('Copying server to group...')

        await createWorkload({
          body: {
            name: currentName,
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
        })

        await queryClient.invalidateQueries({
          queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
        })

        toast.success(
          `Server "${serverName}" copied to group "${groupName}" successfully`,
          { id: toastId }
        )
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

    try {
      while (await attemptCreateWorkload()) {
        // Retry on name conflict unless user cancelled or another error happened
      }
    } finally {
      setIsProcessing(false)
    }

    return true
  }

  return {
    copyServerToGroup,
    isProcessing,
  }
}
