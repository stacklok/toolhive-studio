import type { RegistryEnvVar } from '@api/types.gen'

export type GroupedEnvVars = {
  secrets: RegistryEnvVar[]
  envVars: RegistryEnvVar[]
}

/**
 * Groups environment variables specified by the server into 2 lists:
 * - secret: variables that are marked as secret
 * - non-secret: variables that are not marked as secret
 *
 * Additionally, it sorts the variables in the following order:
 * - Required variables first
 * - Alphabetically after that
 */
export function groupEnvVars(envVars: RegistryEnvVar[]): GroupedEnvVars {
  return [...envVars]
    .sort((a, b) => {
      if (a.required && !b.required) return -1
      if (!a.required && b.required) return 1
      return (a.name ?? '').localeCompare(b.name ?? '') // NOTE: The OpenAPI spec says `name` is optional, but it's always present in reality
    })
    .reduce<GroupedEnvVars>(
      (a, c) => {
        if (c.secret) a.secrets.push(c)
        else a.envVars.push(c)
        return a
      },
      { secrets: [], envVars: [] }
    )
}
