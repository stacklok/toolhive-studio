import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'
import { Copy } from 'lucide-react'
import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../../../../utils/feature-flags'
import { useGroups } from '../../../../hooks/use-groups'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postApiV1BetaWorkloadsMutation } from '@api/@tanstack/react-query.gen'
import { getApiV1BetaWorkloadsByNameExport } from '@api/sdk.gen'
import { getApiV1BetaWorkloadsQueryKey } from '@api/@tanstack/react-query.gen'
import { z } from 'zod/v4'

interface AddServerToGroupMenuItemProps {
  serverName: string
}

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

    let lastRejectedName: string | null = null
    let customName = `${serverName}-${groupName}`
    let toastId: string | number | undefined

    while (true) {
      if (lastRejectedName !== null) {
        const userProvidedName = await ensureUniqueName(prompt, {
          initialValue: customName,
          rejectedName: lastRejectedName,
        })

        if (!userProvidedName) {
          return // User cancelled
        }

        customName = userProvidedName
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
        })

        await queryClient.invalidateQueries({
          queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
        })

        toast.success(
          `Server "${serverName}" copied to group "${groupName}" successfully`,
          { id: toastId }
        )
        return
      } catch (error: unknown) {
        const errorMessage = String(error)
        const is409 = errorMessage.toLowerCase().includes('already exists')

        if (is409) {
          if (toastId) {
            toast.dismiss(toastId)
          }
          lastRejectedName = customName
          continue
        }

        if (toastId) {
          toast.dismiss(toastId)
        }
        toast.error(errorMessage || 'Failed to copy server to group')
        return
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
