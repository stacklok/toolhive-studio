import type { ControllerRenderProps, UseFormReturn } from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormControl,
  FormMessage,
} from '../../ui/form'
import { Input } from '../../ui/input'
import type { RegistryFormData } from './schema'
import { resolveRegistryListLoadErrorMessage } from './registry-errors-message'
import { REGISTRY_FORM_TYPE } from './utils'

const OAUTH_FIELDS = [
  {
    name: 'client_id' as const,
    label: 'Client ID',
    description: 'OAuth client ID for the registry API',
    placeholder: 'my-oauth-client',
    className: 'my-4 w-full max-w-xl',
  },
  {
    name: 'issuer_url' as const,
    label: 'Issuer URL',
    description: 'OIDC issuer URL for registry authentication',
    placeholder: 'https://accounts.example.com',
    className: 'w-full max-w-xl',
  },
]

function OAuthField({
  field,
  label,
  description,
  placeholder,
  className,
  isPending,
  highlightEmpty,
}: {
  field: ControllerRenderProps<RegistryFormData, 'client_id' | 'issuer_url'>
  label: string
  description: string
  placeholder: string
  className: string
  isPending: boolean
  highlightEmpty: boolean
}) {
  const isEmpty = !field.value?.trim()
  const showRequiredError = highlightEmpty && isEmpty
  return (
    <FormItem className={className}>
      <FormLabel>{label}</FormLabel>
      <FormDescription>{description}</FormDescription>
      <FormControl>
        <Input
          placeholder={placeholder}
          {...field}
          value={field.value ?? ''}
          disabled={isPending}
          autoComplete="off"
          aria-invalid={showRequiredError || undefined}
        />
      </FormControl>
      {showRequiredError ? (
        <p className="text-destructive text-sm">{label} is required</p>
      ) : (
        <FormMessage />
      )}
    </FormItem>
  )
}

export function RegistryApiOAuthFields({
  isPending,
  form,
  hasRegistryError,
  registryAuthRequiredMessage,
}: {
  isPending: boolean
  form: UseFormReturn<RegistryFormData>
  hasRegistryError?: boolean
  registryAuthRequiredMessage?: string
}) {
  const registryType = form.watch('type')

  if (registryType !== REGISTRY_FORM_TYPE.API_URL) {
    return null
  }

  const highlightEmptyCredentials =
    !!hasRegistryError && !!registryAuthRequiredMessage

  return (
    <div
      className="border-border mt-2 flex w-full flex-col gap-3 rounded-md border
        p-4"
    >
      <p>Authenticate with your OIDC provider</p>
      {hasRegistryError && (
        <p className="text-destructive text-sm">
          {resolveRegistryListLoadErrorMessage(
            registryType,
            registryAuthRequiredMessage
          )}
        </p>
      )}
      {OAUTH_FIELDS.map(({ name, ...fieldProps }) => (
        <FormField
          key={name}
          control={form.control}
          name={name}
          render={({ field }) => (
            <OAuthField
              field={field}
              isPending={isPending}
              highlightEmpty={highlightEmptyCredentials}
              {...fieldProps}
            />
          )}
        />
      ))}
    </div>
  )
}
