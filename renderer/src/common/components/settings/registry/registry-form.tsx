import type { UseFormReturn } from 'react-hook-form'
import { Form } from '../../ui/form'
import { RegistrySourceField } from './registry-source-field'
import { Button } from '../../ui/button'
import { RegistryTypeField } from './registry-type-field'
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
        className="flex flex-col items-start gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <RegistryTypeField isPending={isLoading} form={form} />
        <RegistrySourceField
          isPending={isLoading}
          form={form}
          hasRegistryError={hasRegistryError}
        />
        <Button
          variant="action"
          className="rounded-full"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}
