import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { registryFormSchema, type RegistryFormData } from './schema'
import {
  mapResponseTypeToFormType,
  REGISTRY_FORM_TYPE,
  registryAuthFromRegistryInfo,
} from './utils'
import { trackEvent } from '@/common/lib/analytics'
import {
  REGISTRY_WRONG_AUTH_TOAST,
  REGISTRY_WRONG_ISSUER_TOAST,
} from './registry-list-error'
import { useRegistryData } from './use-registry-data'

export function useRegistryForm() {
  const {
    defaultRegistry,
    isAuthRequiredError,
    registryAuthRequiredMessage,
    isLoading,
    hasError,
    isMutationError,
    updateRegistry,
  } = useRegistryData()

  const { client_id: initialClientId, issuer_url: initialIssuerUrl } =
    registryAuthFromRegistryInfo(defaultRegistry)

  const formType =
    isAuthRequiredError || isMutationError
      ? REGISTRY_FORM_TYPE.API_URL
      : mapResponseTypeToFormType(defaultRegistry?.type)

  const form = useForm<RegistryFormData>({
    resolver: zodV4Resolver(registryFormSchema),
    values: {
      type: formType,
      source: defaultRegistry?.source ?? '',
      client_id: initialClientId,
      issuer_url: initialIssuerUrl,
    },
    resetOptions: { keepErrors: true, keepDirtyValues: true },
    mode: 'onSubmit',
  })

  const currentType = useWatch({ control: form.control, name: 'type' })

  useEffect(() => {
    if (isAuthRequiredError) {
      if (!initialClientId && !initialIssuerUrl) {
        // No existing config: red borders only, general OIDC box message handles the text
        form.setError('source', { message: '' })
        form.setError('client_id', { message: '' })
        form.setError('issuer_url', { message: '' })
      } else {
        // Existing config with wrong client_id: specific field message
        form.setError('client_id', { message: REGISTRY_WRONG_AUTH_TOAST })
      }
    }
  }, [isAuthRequiredError, form, initialClientId, initialIssuerUrl])

  useEffect(() => {
    form.clearErrors()
  }, [currentType, form])

  const onSubmit = async (data: RegistryFormData) => {
    form.clearErrors(['source', 'client_id', 'issuer_url'])
    try {
      await updateRegistry(data)
      trackEvent('Registry updated', {
        registry_type: data.type,
        registry_source:
          data.type === REGISTRY_FORM_TYPE.DEFAULT ? '' : data.source,
      })
    } catch (e) {
      if (e instanceof Error && e.message === REGISTRY_WRONG_ISSUER_TOAST) {
        form.setError('issuer_url', {
          message:
            'OIDC discovery failed. Make sure the Issuer URL is correct.',
        })
      } else if (
        e instanceof Error &&
        e.message === REGISTRY_WRONG_AUTH_TOAST
      ) {
        form.setError('client_id', { message: REGISTRY_WRONG_AUTH_TOAST })
      }
    }
  }

  const hasRegistryError =
    hasError &&
    (!isAuthRequiredError || (!initialClientId && !initialIssuerUrl))

  return {
    form,
    onSubmit,
    isLoading,
    hasRegistryError,
    registryAuthRequiredMessage,
  }
}
