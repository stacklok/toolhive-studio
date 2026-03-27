import { useForm } from 'react-hook-form'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { registryFormSchema, type RegistryFormData } from './schema'
import {
  mapResponseTypeToFormType,
  REGISTRY_FORM_TYPE,
  registryAuthFromRegistryInfo,
} from './utils'
import { toast } from 'sonner'
import { trackEvent } from '@/common/lib/analytics'
import {
  REGISTRY_WRONG_AUTH_TOAST,
  REGISTRY_WRONG_ISSUER_TOAST,
  REGISTRY_AUTH_FIELDS_REQUIRED_TOAST,
  REGISTRY_AUTH_TOAST_ID,
} from './registry-errors-message'
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
        form.setError('client_id', { message: 'Client ID is required' })
      if (!data.issuer_url?.trim())
        form.setError('issuer_url', { message: 'Issuer URL is required' })
      break
  }
}

export function useRegistryForm() {
  const {
    defaultRegistry,
    isAuthRequiredError,
    isUnavailableError,
    registryAuthRequiredMessage,
    registryUnavailableUrl,
    isLoading,
    hasError,
    isMutationError,
    updateRegistry,
    mutationVariables,
  } = useRegistryData()

  const { client_id: initialClientId, issuer_url: initialIssuerUrl } =
    registryAuthFromRegistryInfo(defaultRegistry)

  const formType =
    isAuthRequiredError || isUnavailableError || isMutationError
      ? REGISTRY_FORM_TYPE.API_URL
      : mapResponseTypeToFormType(defaultRegistry?.type)

  const formSource =
    (isUnavailableError ? registryUnavailableUrl : defaultRegistry?.source) ??
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

  const onSubmit = async (data: RegistryFormData) => {
    form.clearErrors(['source', 'client_id', 'issuer_url'])
    try {
      await updateRegistry(data)
      toast.dismiss(REGISTRY_AUTH_TOAST_ID)
      trackEvent('Registry updated', {
        registry_type: data.type,
        registry_source:
          data.type === REGISTRY_FORM_TYPE.DEFAULT ? '' : data.source,
      })
    } catch (e) {
      applySubmitFieldErrors(form, e, data)
    }
  }

  const onReset = async () => {
    form.clearErrors()
    try {
      await updateRegistry({ type: REGISTRY_FORM_TYPE.DEFAULT })
      toast.dismiss(REGISTRY_AUTH_TOAST_ID)
      trackEvent('Registry reset to default')
    } catch (e) {
      applySubmitFieldErrors(form, e, {
        type: REGISTRY_FORM_TYPE.DEFAULT,
      })
    }
  }

  const isResetting =
    isLoading && mutationVariables?.type === REGISTRY_FORM_TYPE.DEFAULT
  const hasRegistryError = hasError && !isUnavailableError

  return {
    form,
    onSubmit,
    onReset,
    isLoading,
    isResetting,
    hasRegistryError,
    isUnavailableError,
    registryAuthRequiredMessage,
  }
}
