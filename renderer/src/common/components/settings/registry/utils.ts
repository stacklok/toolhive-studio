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

/**
 * Response types returned by GET /registry endpoint.
 * These are the values in V1RegistryInfo.type field.
 */
export type RegistryResponseType = 'file' | 'url' | 'default' | 'api'

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
