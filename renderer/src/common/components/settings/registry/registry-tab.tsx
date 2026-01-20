import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import {
  getApiV1BetaRegistryByName,
  putApiV1BetaRegistryByName,
} from '@api/sdk.gen'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { registryFormSchema, type RegistryFormData } from './schema'
import { mapResponseTypeToFormType, mapFormTypeToResponseType } from './utils'
import { RegistryForm } from './registry-form'
import { delay } from '@utils/delay'
import { trackEvent } from '@/common/lib/analytics'
import { queryClient } from '@/common/lib/query-client'

export function RegistryTab() {
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
    placeholderData: keepPreviousData,
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
        queryClient.setQueryData(['registry'], {
          data: {
            type: mapFormTypeToResponseType(variables.type),
            source: variables.source ?? '',
          },
        })

        queryClient.invalidateQueries({
          queryKey: ['registry'],
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
    mode: 'onChange',
    reValidateMode: 'onChange',
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
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Registry</h2>
      </div>
      <div className="space-y-4">
        <RegistryForm
          form={form}
          onSubmit={onSubmit}
          isLoading={isLoading}
          hasRegistryError={!!registryError}
        />
      </div>
    </div>
  )
}
