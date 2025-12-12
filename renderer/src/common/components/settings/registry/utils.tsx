import { Button } from '../../ui/button'

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

type RegistryInputType = Exclude<RegistryFormType, 'default'>

export const REGISTRY_INPUT_CONFIG = {
  local_path: {
    label: 'Registry File Path',
    placeholder: '/path/to/registry.json',
    useFilePicker: true,
    description:
      'Provide the absolute path to a local registry JSON file on your system.',
  },
  url: {
    label: 'Registry URL',
    placeholder: 'https://domain.com/registry.json',
    useFilePicker: false,
    description: (
      <>
        Provide the HTTPS URL of a remote registry (
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <a
            href="https://raw.githubusercontent.com/stacklok/toolhive/refs/heads/main/pkg/registry/data/registry.json"
            target="_blank"
            rel="noopener noreferrer"
          >
            official ToolHive registry
          </a>
        </Button>
        ).
      </>
    ),
  },
  api_url: {
    label: 'Registry Server API URL',
    placeholder: 'https://domain.com:8080/api/registry',
    useFilePicker: false,
    description: 'Provide the HTTPS URL of a registry server API.',
  },
} as const satisfies Record<
  RegistryInputType,
  {
    label: string
    placeholder: string
    useFilePicker: boolean
    description: React.ReactNode
  }
>

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
