import type { QueryClient } from '@tanstack/react-query'
import { postApiV1BetaSecrets } from '@common/api/generated/sdk.gen'
import { getApiV1BetaSecretsDefaultOptions } from '@common/api/generated/@tanstack/react-query.gen'
import log from 'electron-log/renderer'

/**
 * Ensures an encrypted secret provider exists in the backend. Queries the
 * current provider type first; if it is not "encrypted", creates one.
 * Used in the root loader (not beforeLoad) because it is not a navigation
 * guard but a one-time setup that only runs when ToolHive is confirmed running.
 */
export async function setupSecretProvider(
  queryClient: QueryClient
): Promise<void> {
  const createEncryptedProvider = async () =>
    postApiV1BetaSecrets({
      body: { provider_type: 'encrypted' },
      throwOnError: true,
    })

  return queryClient
    .ensureQueryData(getApiV1BetaSecretsDefaultOptions())
    .then(async (res) => {
      if (res?.provider_type !== 'encrypted') {
        await createEncryptedProvider()
      }
    })
    .catch(async (err) => {
      log.info(
        'Error setting up secret provider, creating encrypted provider',
        JSON.stringify(err)
      )
      await createEncryptedProvider()
    })
}
