import { Loader2 } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { Form } from '../../ui/form'
import { RegistrySourceField } from './registry-source-field'
import { RegistryApiOAuthFields } from './registry-api-oauth-fields'
import { Button } from '../../ui/button'
import { RegistryTypeField } from './registry-type-field'
import { Separator } from '../../ui/separator'
import type { RegistryFormData } from './schema'

interface RegistryFormProps {
  form: UseFormReturn<RegistryFormData>
  onSubmit: (data: RegistryFormData) => void
  onReset: () => void
  isLoading: boolean
  isResetting: boolean
  hasRegistryError: boolean
  registryAuthRequiredMessage?: string
}

function getSubmitLabel(isLoading: boolean, hasOAuthFields: boolean): string {
  if (isLoading) return hasOAuthFields ? 'Signing in...' : 'Saving...'
  return 'Save'
}

export function RegistryForm({
  form,
  onSubmit,
  onReset,
  isLoading,
  isResetting,
  hasRegistryError,
  registryAuthRequiredMessage,
}: RegistryFormProps) {
  const [type, clientId, issuerUrl] = form.watch([
    'type',
    'client_id',
    'issuer_url',
  ])
  const hasOAuthFields =
    type === 'api_url' && !!(clientId?.trim() && issuerUrl?.trim())
  const isDefault = type === 'default'
  const isSaving = isLoading && !isResetting
  return (
    <Form {...form}>
      <form
        className="flex flex-col items-start gap-3"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex w-full flex-col gap-3 py-1">
          <div className="flex max-w-xl flex-col gap-3">
            <RegistryTypeField isPending={isLoading} form={form} />
            <RegistrySourceField
              isPending={isLoading}
              form={form}
              hasRegistryError={hasRegistryError}
              registryAuthRequiredMessage={registryAuthRequiredMessage}
            />
          </div>
          <RegistryApiOAuthFields
            isPending={isLoading}
            form={form}
            hasRegistryError={hasRegistryError}
            registryAuthRequiredMessage={registryAuthRequiredMessage}
          />
          <Separator className="my-1 w-full" />
        </div>
        <div className="flex gap-2">
          <Button variant="action" type="submit" disabled={isLoading}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            {getSubmitLabel(isSaving, hasOAuthFields)}
          </Button>
          {!isDefault && (
            <Button
              variant="secondary"
              className="rounded-full"
              type="button"
              disabled={isLoading}
              onClick={onReset}
            >
              {isResetting && <Loader2 className="size-4 animate-spin" />}
              {isResetting ? 'Resetting...' : 'Reset Registry'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
