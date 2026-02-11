import type {
  RegistryEnvVar,
  V1CreateRequest,
} from '@common/api/generated/types.gen'

export interface EnvVarDriftItem {
  name: string
  required: boolean
  secret: boolean
}

export interface EnvVarDrift {
  /** Env vars/secrets defined in the registry but missing locally */
  added: EnvVarDriftItem[]
  /** Env vars/secrets present locally but not defined in the registry */
  removed: Array<{ name: string; secret: boolean }>
}

/**
 * Compares the registry env var definitions against the local workload config
 * to detect configuration drift (new or removed variables between versions).
 */
export function getEnvVarsDrift(
  registryEnvVars: RegistryEnvVar[] | undefined,
  workloadData: V1CreateRequest
): EnvVarDrift | null {
  if (!registryEnvVars || registryEnvVars.length === 0) return null

  // Build set of local env var names from env_vars keys + secrets targets
  const localEnvVarNames = new Set(Object.keys(workloadData.env_vars ?? {}))
  const localSecretTargets = new Set(
    (workloadData.secrets ?? [])
      .map((s) => s.target)
      .filter((t): t is string => !!t)
  )
  const allLocalNames = new Set([...localEnvVarNames, ...localSecretTargets])

  // Build set of registry env var names
  const registryNames = new Set(
    registryEnvVars.map((v) => v.name).filter((n): n is string => !!n)
  )

  // Added: in registry but not locally
  const added = registryEnvVars
    .filter((v) => v.name && !allLocalNames.has(v.name))
    .map((v) => ({
      name: v.name!,
      required: v.required ?? false,
      secret: v.secret ?? false,
    }))

  // Removed: locally present but not in registry
  const removedEnvVars = [...localEnvVarNames]
    .filter((name) => !registryNames.has(name))
    .map((name) => ({ name, secret: false }))

  const removedSecrets = [...localSecretTargets]
    .filter((name) => !registryNames.has(name))
    .map((name) => ({ name, secret: true }))

  const removed = [...removedEnvVars, ...removedSecrets]

  if (added.length === 0 && removed.length === 0) return null

  return { added, removed }
}
