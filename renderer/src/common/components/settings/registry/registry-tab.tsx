import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import {
  getApiV1BetaRegistryByName,
  putApiV1BetaRegistryByName,
} from '@api/sdk.gen'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { useEffect } from 'react'
import { registryFormSchema, type RegistryFormData } from './schema'
import { RegistryForm } from './registry-form'
import { delay } from '@utils/delay'
import { trackEvent } from '@/common/lib/analytics'

export function RegistryTab() {
  const { isPending: isPendingRegistry, data: registry } = useQuery({
    queryKey: ['registry'],
    queryFn: () =>
      getApiV1BetaRegistryByName({
        path: {
          name: 'default',
        },
      }),
  })
  const registryData = registry?.data

  const { mutateAsync: updateRegistry, isPending: isPendingUpdate } =
    useToastMutation({
      mutationFn: async (data: RegistryFormData) => {
        const body =
          data.type === 'url'
            ? { url: data.source?.trim() }
            : { local_path: data.source?.trim() }
        await delay(500)
        return putApiV1BetaRegistryByName({
          path: {
            name: 'default',
          },
          body,
        })
      },
      successMsg: 'Registry updated successfully',
      errorMsg: 'Failed to update registry',
      loadingMsg: 'Updating registry...',
    })
  const isLoading = isPendingRegistry || isPendingUpdate

  const form = useForm<RegistryFormData>({
    resolver: zodV4Resolver(registryFormSchema),
    defaultValues: {
      type: (registryData?.type as RegistryFormData['type']) ?? 'default',
      source: registryData?.source ?? '',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  })

  useEffect(() => {
    form.setValue(
      'type',
      (registryData?.type as RegistryFormData['type']) ?? 'default'
    )
    form.setValue('source', registryData?.source ?? '')
    form.trigger(['type', 'source'])
  }, [form, registryData])

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
        <RegistryForm form={form} onSubmit={onSubmit} isLoading={isLoading} />
      </div>
    </div>
  )
}
