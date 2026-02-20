import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import {
  getApiV1BetaRegistryByName,
  putApiV1BetaRegistryByName,
} from '@common/api/generated/sdk.gen'
import { getApiV1BetaRegistryByNameServersQueryKey } from '@common/api/generated/@tanstack/react-query.gen'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { registryFormSchema, type RegistryFormData } from './schema'
import { mapResponseTypeToFormType, mapFormTypeToResponseType } from './utils'
import { RegistryForm } from './registry-form'
import { delay } from '@utils/delay'
import { trackEvent } from '@/common/lib/analytics'
import { SettingsSectionTitle } from '../tabs/components/settings-section-title'

export function RegistryTab() {
  const queryClient = useQueryClient()
  const {
    isPending: isPendingRegistry,
    data: registry,
    error: registryError,
  } = useQuery({
    queryKey: ['registry'],
    queryFn: () =>
      getApiV1BetaRegistryByName({
        path: {
          name: 'default',
        },
        throwOnError: true,
      }),
    retry: false,
  })
  const registryData = registry?.data

  const { mutateAsync: updateRegistry, isPending: isPendingUpdate } =
    useToastMutation({
      mutationFn: async (data: RegistryFormData) => {
        const source = data.source?.trim()
        const type = data.type
        const body =
          type === 'default'
            ? {}
            : {
                [type]: source,
                //  Allow private IP addresses for API URL
                ...(type === 'api_url' ? { allow_private_ip: true } : {}),
              }

        await delay(500)
        return putApiV1BetaRegistryByName({
          path: {
            name: 'default',
          },
          body,
        })
      },
      onSuccess: (_, variables) => {
        const normalizedSource = variables.source?.trim() ?? ''

        queryClient.setQueryData(['registry'], {
          data: {
            type: mapFormTypeToResponseType(variables.type),
            source: normalizedSource,
          },
        })

        queryClient.invalidateQueries({
          queryKey: ['registry'],
        })

        // Remove registry servers query to force fresh fetch
        queryClient.removeQueries({
          queryKey: getApiV1BetaRegistryByNameServersQueryKey({
            path: { name: 'default' },
          }),
        })
      },
      successMsg: 'Registry updated successfully',
      errorMsg: 'Failed to update registry',
      loadingMsg: 'Updating registry...',
    })
  const isLoading = isPendingRegistry || isPendingUpdate

  const form = useForm<RegistryFormData>({
    resolver: zodV4Resolver(registryFormSchema),
    values: {
      type: mapResponseTypeToFormType(registryData?.type),
      source: registryData?.source ?? '',
    },
    mode: 'onSubmit',
  })

  const onSubmit = async (data: RegistryFormData) => {
    if (data.type === 'default') {
      trackEvent('Registry updated', {
        registry_type: 'default',
        registry_source: '',
      })
      await updateRegistry({ type: 'default' })
      form.setValue('type', 'default')
      form.setValue('source', '')
      form.trigger(['type', 'source'])
    } else {
      await updateRegistry(data)
      trackEvent('Registry updated', {
        registry_type: data.type,
        registry_source: data.source,
      })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <SettingsSectionTitle>Registry</SettingsSectionTitle>
        <p className="text-muted-foreground text-sm leading-5.5">
          Choose between ToolHive default registry, a custom remote registry
          JSON URL, a custom local registry JSON file, or a custom registry
          server API URL.
        </p>
      </div>
      <RegistryForm
        form={form}
        onSubmit={onSubmit}
        isLoading={isLoading}
        hasRegistryError={!!registryError}
      />
    </div>
  )
}
