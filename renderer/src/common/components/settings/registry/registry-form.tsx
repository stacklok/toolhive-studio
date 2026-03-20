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
  isLoading: boolean
  hasRegistryError: boolean
  registryAuthRequiredMessage?: string
}

function getSubmitLabel(isLoading: boolean, isAuthType: boolean): string {
  if (isLoading) return 'Signing in...'
  if (isAuthType) return 'Save & Sign in'
  return 'Save'
}

export function RegistryForm({
  form,
  onSubmit,
  isLoading,
  hasRegistryError,
  registryAuthRequiredMessage,
}: RegistryFormProps) {
  const isAuthRegistryType = form.watch('type') === 'api_url'
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
        <Button variant="action" type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {getSubmitLabel(isLoading, isAuthRegistryType)}
        </Button>
      </form>
    </Form>
  )
}
