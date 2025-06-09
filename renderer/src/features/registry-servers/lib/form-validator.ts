interface FormEnvVar {
  name: string
  value?: string
  useDefault: boolean
}

interface ServerEnvVar {
  name?: string
  required?: boolean
}

const hasValue = (value?: string) => value && value.trim() !== ''

const isValidEnvVar = (
  formEnvVar: FormEnvVar | undefined,
  serverEnvVar: ServerEnvVar
) => {
  if (!formEnvVar) return !serverEnvVar.required
  if (!serverEnvVar.required) return true
  if (formEnvVar.useDefault) return true
  return hasValue(formEnvVar.value)
}

export const validateRequiredEnvVars = (
  envVars: FormEnvVar[],
  serverEnvVars?: ServerEnvVar[]
) =>
  serverEnvVars?.every((serverEnvVar, index) =>
    isValidEnvVar(envVars[index], serverEnvVar)
  ) ?? true
