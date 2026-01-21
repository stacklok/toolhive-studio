import type { V1ListSecretsResponse } from '@api/types.gen'
import { SECRET_NAME_REGEX } from '../../../features/registry-servers/lib/secret-name-regex'
import type { SecretFieldValue, PreparedSecret } from '@/common/types/secrets'

/**
 * A utility function to update the keys used in the form schema to prevent any
 * naming conflicts with existing secrets.
 * Strategy:
 * - If the secret name already exists in the secret store, append a number to
 *   the name to make it unique, e.g. `MY_API_TOKEN` -> `MY_API_TOKEN_2`
 * - If the secret name already exists in the store *with* a number appended,
 *   increment the number until a unique name is found, e.g. `MY_API_TOKEN_2` -> `MY_API_TOKEN_3`
 * - If the secret name does not exist, use it as is.
 */
export function prepareSecretsWithoutNamingCollision(
  /**
   * NOTE: For simplicity, we are expecting that any undefined secrets are
   * already filtered out by this stage
   */
  secrets: SecretFieldValue[],
  fetchedSecrets: V1ListSecretsResponse
): PreparedSecret[] {
  // A map is the most efficient way to check for existing keys
  const keyMap = new Set(
    fetchedSecrets.keys
      ?.filter((k) => k != null)
      .map((secret) => secret.key || '') || []
  )

  return secrets.map((secret) => {
    // Invariant — this should never happen
    if (secret.value.isFromStore) {
      throw new Error('Secret value from store should not be recreated')
    }

    let secretStoreKey = secret.name

    // Early return — if the key does not exist, we can use it as is
    if (keyMap.has(secretStoreKey) === false) {
      return {
        secretStoreKey,
        target: secret.name,
        value: secret.value.secret,
      }
    }

    // Extract base name and number if the key already has a number suffix
    const match = secretStoreKey.match(SECRET_NAME_REGEX)
    if (!match) {
      // This shouldn't happen, but handle as fallback
      secretStoreKey = `${secretStoreKey}_${Date.now()}`
    } else {
      const [, baseName, currentNumberStr] = match
      const currentNumber = currentNumberStr
        ? parseInt(currentNumberStr, 10)
        : 1

      // Find the next available number
      let nextNumber = currentNumber + 1
      let candidateKey = `${baseName}_${nextNumber}`

      while (keyMap.has(candidateKey)) {
        nextNumber++
        candidateKey = `${baseName}_${nextNumber}`
      }

      secretStoreKey = candidateKey
    }

    return {
      secretStoreKey,
      target: secret.name,
      value: secret.value.secret,
    }
  })
}
