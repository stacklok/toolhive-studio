/**
 * Form types used for UI selection and UPDATE request field names.
 * These map directly to the V1UpdateRegistryRequest field names.
 */
export const REGISTRY_FORM_TYPES = [
  'local_path',
  'url',
  'default',
  'api_url',
] as const

type RegistryFormType = (typeof REGISTRY_FORM_TYPES)[number]

export const REGISTRY_TYPE_OPTIONS = [
  { value: 'default', label: 'Default Registry' },
  { value: 'url', label: 'Remote Registry (JSON URL)' },
  { value: 'local_path', label: 'Local Registry (JSON File Path)' },
  { value: 'api_url', label: 'Registry Server API' },
] as const satisfies ReadonlyArray<{
  value: RegistryFormType
  label: string
}>

export type RegistryInputType = Exclude<RegistryFormType, 'default'>

/**
 * Maps GET response type to form type for populating the form from API data.
 */
export function mapResponseTypeToFormType(
  responseType: string | undefined
): (typeof REGISTRY_FORM_TYPES)[number] {
  switch (responseType) {
    case 'api':
      return 'api_url'
    case 'file':
      return 'local_path'
    case 'url':
      return 'url'
    case 'default':
    default:
      return 'default'
  }
}

/**
 * Maps form type back to API response type for cache updates.
 * Inverse of mapResponseTypeToFormType.
 */
export function mapFormTypeToResponseType(
  formType: (typeof REGISTRY_FORM_TYPES)[number]
): string {
  switch (formType) {
    case 'api_url':
      return 'api'
    case 'local_path':
      return 'file'
    case 'url':
      return 'url'
    case 'default':
    default:
      return 'default'
  }
}
