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
  REGISTRY_AUTH_FIELDS_REQUIRED_TOAST,
} from './registry-list-error'
import { useRegistryData } from './use-registry-data'

type FormRef = ReturnType<typeof useForm<RegistryFormData>>

function applySubmitFieldErrors(
  form: FormRef,
  error: unknown,
  data: RegistryFormData
) {
  const message = error instanceof Error ? error.message : undefined

  switch (message) {
    case REGISTRY_WRONG_ISSUER_TOAST:
      form.setError('issuer_url', {
        message: 'OIDC discovery failed. Make sure the Issuer URL is correct.',
      })
      break
    case REGISTRY_WRONG_AUTH_TOAST:
      form.setError('client_id', { message: REGISTRY_WRONG_AUTH_TOAST })
      break
    case REGISTRY_AUTH_FIELDS_REQUIRED_TOAST:
      if (!data.client_id?.trim())
        form.setError('client_id', {
          message: REGISTRY_AUTH_FIELDS_REQUIRED_TOAST,
        })
      if (!data.issuer_url?.trim())
        form.setError('issuer_url', {
          message: REGISTRY_AUTH_FIELDS_REQUIRED_TOAST,
        })
      break
  }
}

export function useRegistryForm() {
  const {
    defaultRegistry,
    isAuthRequiredError,
    isUnavailableError,
    registryAuthRequiredMessage,
    registryUnavailableMessage,
    registryUnavailableUrl,
    isLoading,
    hasError,
    isMutationError,
    updateRegistry,
  } = useRegistryData()

  const { client_id: initialClientId, issuer_url: initialIssuerUrl } =
    registryAuthFromRegistryInfo(defaultRegistry)

  const formType =
    isAuthRequiredError || isUnavailableError || isMutationError
      ? REGISTRY_FORM_TYPE.API_URL
      : mapResponseTypeToFormType(defaultRegistry?.type)

  const formSource =
    defaultRegistry?.source ??
    (isUnavailableError ? registryUnavailableUrl : undefined) ??
    ''

  const form = useForm<RegistryFormData>({
    resolver: zodV4Resolver(registryFormSchema),
    values: {
      type: formType,
      source: formSource,
      client_id: initialClientId,
      issuer_url: initialIssuerUrl,
    },
    resetOptions: { keepErrors: true, keepDirtyValues: true },
    mode: 'onSubmit',
  })

  const currentType = useWatch({ control: form.control, name: 'type' })

  useEffect(() => {
    if (isUnavailableError && registryUnavailableMessage) {
      form.setError('source', { message: registryUnavailableMessage })
      return
    }
    if (isAuthRequiredError) {
      if (!initialClientId && !initialIssuerUrl) {
        form.setError('source', { message: '' })
        form.setError('client_id', { message: '' })
        form.setError('issuer_url', { message: '' })
      } else {
        form.setError('client_id', { message: REGISTRY_WRONG_AUTH_TOAST })
      }
    }
  }, [
    isAuthRequiredError,
    isUnavailableError,
    registryUnavailableMessage,
    form,
    initialClientId,
    initialIssuerUrl,
  ])

  useEffect(() => {
    if (!isUnavailableError && !isAuthRequiredError) {
      form.clearErrors()
    }
  }, [currentType, form, isUnavailableError, isAuthRequiredError])

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
      applySubmitFieldErrors(form, e, data)
    }
  }

  const hasRegistryError =
    hasError &&
    !isUnavailableError &&
    (!isAuthRequiredError || (!initialClientId && !initialIssuerUrl))

  return {
    form,
    onSubmit,
    isLoading,
    hasRegistryError,
    registryAuthRequiredMessage,
    registryUnavailableMessage,
  }
}
