import type { UseFormReturn } from 'react-hook-form'
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
import { resolveRegistryListLoadErrorMessage } from './registry-list-error'

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

  if (registryType !== 'api_url') {
    return null
  }

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
      <FormField
        control={form.control}
        name="client_id"
        render={({ field }) => (
          <FormItem className="my-4 w-full max-w-xl">
            <FormLabel>Client ID</FormLabel>
            <FormDescription>
              OAuth client ID for the registry API
            </FormDescription>
            <FormControl>
              <Input
                placeholder="my-oauth-client"
                {...field}
                value={field.value ?? ''}
                disabled={isPending}
                autoComplete="off"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="issuer_url"
        render={({ field }) => (
          <FormItem className="w-full max-w-xl">
            <FormLabel>Issuer URL</FormLabel>
            <FormDescription>
              OIDC issuer URL for registry authentication
            </FormDescription>
            <FormControl>
              <Input
                placeholder="https://accounts.example.com"
                {...field}
                value={field.value ?? ''}
                disabled={isPending}
                autoComplete="off"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
