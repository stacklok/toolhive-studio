import type { V1ListSecretsResponse } from '@/common/api/generated'
import type { PreparedSecret } from '../types'
import { SECRET_NAME_REGEX } from './secret-name-regex'

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
  secrets: {
    name: string
    value: string
  }[],
  existingSecrets: V1ListSecretsResponse
): PreparedSecret[] {
  // A map is the most efficient way to check for existing keys
  const keyMap = new Set(
    existingSecrets.keys
      ?.filter((k) => k != null)
      .map((secret) => secret.key || '') || []
  )

  return secrets.map((secret) => {
    let secretStoreKey = secret.name

    // Early return — if the key does not exist, we can use it as is
    if (keyMap.has(secretStoreKey) === false) {
      return {
        secretStoreKey,
        target: secret.name,
        value: secret.value,
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
      value: secret.value,
    }
  })
}
