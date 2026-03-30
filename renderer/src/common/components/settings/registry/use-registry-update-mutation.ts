import { useQueryClient } from '@tanstack/react-query'
import type {
  PkgApiV1RegistryInfo,
  PkgApiV1RegistryListResponse,
  PkgApiV1RegistryType,
  PkgApiV1UpdateRegistryRequest,
} from '@common/api/generated/types.gen'
import {
  getApiV1BetaRegistryQueryKey,
  getApiV1BetaRegistryByNameServersQueryKey,
} from '@common/api/generated/@tanstack/react-query.gen'
import {
  postApiV1BetaRegistryAuthLogin,
  postApiV1BetaRegistryAuthLogout,
  putApiV1BetaRegistryByName,
} from '@common/api/generated/sdk.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import type { RegistryFormData } from './schema'
import { mapFormTypeToResponseType, REGISTRY_FORM_TYPE } from './utils'
import { delay } from '@utils/delay'
import {
  REGISTRY_WRONG_AUTH_TOAST,
  REGISTRY_WRONG_ISSUER_TOAST,
  OIDC_DISCOVERY_PATTERN,
  AUTH_FIELDS_REQUIRED_PATTERN,
  REGISTRY_AUTH_FIELDS_REQUIRED_TOAST,
} from './registry-errors-message'

const REGISTRY_DEFAULT_PATH = { name: 'default' } as const

const KNOWN_TOAST_MESSAGES: string[] = [
  REGISTRY_WRONG_ISSUER_TOAST,
  REGISTRY_WRONG_AUTH_TOAST,
  REGISTRY_AUTH_FIELDS_REQUIRED_TOAST,
]

function buildRegistryAuth(data: RegistryFormData) {
  const clientId = data.client_id?.trim()
  const issuer = data.issuer_url?.trim()
  if (!clientId && !issuer) return undefined
  return {
    ...(clientId ? { client_id: clientId } : {}),
    ...(issuer ? { issuer } : {}),
  }
}

async function putRegistry(body: PkgApiV1UpdateRegistryRequest, type: string) {
  return putApiV1BetaRegistryByName({
    path: REGISTRY_DEFAULT_PATH,
    body,
    throwOnError: true,
  }).catch((e) => {
    if (type === REGISTRY_FORM_TYPE.API_URL && typeof e === 'string') {
      if (e.includes(OIDC_DISCOVERY_PATTERN))
        throw new Error(REGISTRY_WRONG_ISSUER_TOAST)
      if (e.includes(AUTH_FIELDS_REQUIRED_PATTERN))
        throw new Error(REGISTRY_AUTH_FIELDS_REQUIRED_TOAST)
    }
    throw e
  })
}

// Optimistically updates the registry cache after a successful PUT so the UI
// reflects the new values immediately, then invalidates to sync with the server.
// Skipped for api_url because the server may return updated auth config after login.
function updateRegistryCache(
  queryClient: ReturnType<typeof useQueryClient>,
  variables: RegistryFormData
) {
  const queryKey = getApiV1BetaRegistryQueryKey()
  const normalizedSource = variables.source?.trim() ?? ''
  queryClient.setQueryData(
    queryKey,
    (prev: PkgApiV1RegistryListResponse | undefined) => {
      const registries = prev?.registries ?? []
      const [first, ...rest] = registries
      const updated: PkgApiV1RegistryInfo = {
        ...(first ?? { name: 'default' }),
        type: mapFormTypeToResponseType(variables.type) as PkgApiV1RegistryType,
        source: normalizedSource,
      }
      return { registries: [updated, ...rest] }
    }
  )
  queryClient.invalidateQueries({ queryKey })
}

async function authenticateWithRegistry(
  queryClient: ReturnType<typeof useQueryClient>
) {
  const registryQueryKey = getApiV1BetaRegistryQueryKey()
  try {
    await postApiV1BetaRegistryAuthLogin({ throwOnError: true })
  } catch {
    await queryClient.invalidateQueries({ queryKey: registryQueryKey })
    void postApiV1BetaRegistryAuthLogout({ throwOnError: true }).catch(() => {})
    throw new Error(REGISTRY_WRONG_AUTH_TOAST)
  }
}

function buildRegistryBody(
  data: RegistryFormData,
  auth: ReturnType<typeof buildRegistryAuth>
): PkgApiV1UpdateRegistryRequest {
  const { type } = data
  if (type === REGISTRY_FORM_TYPE.DEFAULT) return {}
  const source = data.source?.trim()
  if (type !== REGISTRY_FORM_TYPE.API_URL) return { [type]: source }
  return { api_url: source, allow_private_ip: true, ...(auth ? { auth } : {}) }
}

export function useRegistryUpdateMutation() {
  const queryClient = useQueryClient()

  return useToastMutation({
    mutationFn: async (data: RegistryFormData) => {
      const { type } = data
      const auth =
        type === REGISTRY_FORM_TYPE.API_URL
          ? buildRegistryAuth(data)
          : undefined
      const body = buildRegistryBody(data, auth)

      await delay(300)
      await putRegistry(body, type)

      if (auth) {
        await authenticateWithRegistry(queryClient)
      }
    },
    onSuccess: (_, variables) => {
      if (variables.type !== REGISTRY_FORM_TYPE.API_URL) {
        updateRegistryCache(queryClient, variables)
      } else {
        queryClient.invalidateQueries({
          queryKey: getApiV1BetaRegistryQueryKey(),
        })
      }

      queryClient.removeQueries({
        queryKey: getApiV1BetaRegistryByNameServersQueryKey({
          path: REGISTRY_DEFAULT_PATH,
        }),
      })
    },
    successMsg: 'Registry updated successfully',
    errorMsg: (e) => {
      if (e instanceof Error && KNOWN_TOAST_MESSAGES.includes(e.message))
        return e.message
      return 'Failed to update registry'
    },
    loadingMsg: (data) =>
      data.type === REGISTRY_FORM_TYPE.API_URL
        ? 'Attempting to authenticate with your OIDC provider...'
        : 'Updating registry...',
  })
}
