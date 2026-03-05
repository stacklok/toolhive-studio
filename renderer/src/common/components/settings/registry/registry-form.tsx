import type { UseFormReturn } from 'react-hook-form'
import { Form } from '../../ui/form'
import { RegistrySourceField } from './registry-source-field'
import { Button } from '../../ui/button'
import { RegistryTypeField } from './registry-type-field'
import { Separator } from '../../ui/separator'
import type { RegistryFormData } from './schema'

interface RegistryFormProps {
  form: UseFormReturn<RegistryFormData>
  onSubmit: (data: RegistryFormData) => void
  isLoading: boolean
  hasRegistryError: boolean
}

export function RegistryForm({
  form,
  onSubmit,
  isLoading,
  hasRegistryError,
}: RegistryFormProps) {
  return (
    <Form {...form}>
      <form
        className="flex flex-col items-start gap-3"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex w-full flex-col gap-3 py-1">
          <RegistryTypeField isPending={isLoading} form={form} />
          <RegistrySourceField
            isPending={isLoading}
            form={form}
            hasRegistryError={hasRegistryError}
          />
          <Separator className="my-1 w-full" />
        </div>
        <Button variant="action" type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}
