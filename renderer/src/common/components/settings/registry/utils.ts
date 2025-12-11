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
