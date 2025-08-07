import { useQuery } from '@tanstack/react-query'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { z } from 'zod/v4'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import {
  getApiV1BetaRegistryByName,
  putApiV1BetaRegistryByName,
} from '@api/sdk.gen'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'

const registryFormSchema = z
  .object({
    type: z.enum(['remote', 'local', 'none']).default('none'),
    value: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'remote' || data.type === 'local') {
        return data.value && data.value.trim().length > 0
      }
      return true
    },
    {
      message: 'Registry URL or file path is required',
      path: ['value'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'remote' || data.type === 'local') {
        return data.value?.endsWith('.json')
      }
      return true
    },
    {
      message: 'Registry must be a .json file',
      path: ['value'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'remote' && data.value) {
        if (
          !data.value.startsWith('http://') &&
          !data.value.startsWith('https://')
        ) {
          return false
        }
        try {
          new URL(data.value)
          return true
        } catch {
          return false
        }
      }
      return true
    },
    {
      message: 'Remote registry must be a valid HTTP/HTTPS URL',
      path: ['value'],
    }
  )

type RegistryFormData = z.infer<typeof registryFormSchema>

function RegistryTypeField({
  isPending,
  form,
}: {
  isPending: boolean
  form: UseFormReturn<RegistryFormData>
}) {
  return (
    <FormField
      control={form.control}
      name="type"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel required>Registry Type</FormLabel>
          <FormDescription>
            Choose between ToolHive default registry, a custom remote registry
            (HTTP/HTTPS URL), or a custom local registry file.
          </FormDescription>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger disabled={isPending}>
                <SelectValue placeholder="Select registry type" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="none">Default Registry</SelectItem>
              <SelectItem value="remote">Remote Registry (URL)</SelectItem>
              <SelectItem value="local">Local Registry (File Path)</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function RegistryValueField({
  isPending,
  form,
}: {
  isPending: boolean
  form: UseFormReturn<RegistryFormData>
}) {
  const registryType = form.watch('type')

  // Don't render the field if type is 'none'
  if (registryType === 'none') {
    return null
  }

  return (
    <FormField
      control={form.control}
      name="value"
      render={({ field }) => {
        const isRemote = registryType === 'remote'

        return (
          <FormItem className="w-full">
            <FormLabel required>
              {isRemote ? 'Registry URL' : 'Registry File Path'}
            </FormLabel>
            <FormDescription>
              {isRemote ? (
                <>
                  Provide the HTTP/HTTPS URL of a remote registry (
                  <Button
                    asChild
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                  >
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
              ) : (
                'Provide the absolute path to a local registry JSON file on your system.'
              )}
            </FormDescription>
            <FormControl>
              <Input
                placeholder={
                  isRemote
                    ? 'https://raw.githubusercontent.com/stacklok/toolhive/refs/heads/main/pkg/registry/data/registry.json'
                    : '/path/to/registry.json'
                }
                {...field}
                disabled={isPending}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export function RegistryTab() {
  const { isPending: isPendingRegistry } = useQuery({
    queryKey: ['registry'],
    queryFn: () =>
      getApiV1BetaRegistryByName({
        path: {
          name: 'default',
        },
      }),
  })

  const { mutateAsync: updateRegistry, isPending: isPendingUpdate } =
    useToastMutation({
      mutationFn: (data: RegistryFormData) => {
        const body =
          data.type === 'remote'
            ? { url: data.value?.trim() }
            : { local_path: data.value?.trim() }

        return putApiV1BetaRegistryByName({
          path: {
            name: 'default',
          },
          body,
        })
      },
      successMsg: 'Registry updated successfully',
      errorMsg: 'Failed to update registry',
      loadingMsg: 'Updating registry...',
    })
  const isLoading = isPendingRegistry || isPendingUpdate

  const form = useForm<RegistryFormData>({
    resolver: zodV4Resolver(registryFormSchema),
    defaultValues: {
      type: 'none', // TODO: fix this
      value: '', // TODO: fix this
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  })

  const onSubmit = async (data: RegistryFormData) => {
    await updateRegistry(data)
  }

  const handleReset = async () => {
    console.log('handleReset')
    await updateRegistry({ type: 'none' })
    form.setValue('type', 'none')
    form.setValue('value', '')
    form.trigger(['type', 'value'])
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Registry</h2>
      </div>
      <div className="space-y-4">
        <Form {...form}>
          <form
            className="flex flex-col items-start gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <RegistryTypeField isPending={isLoading} form={form} />
            <RegistryValueField isPending={isLoading} form={form} />

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading || form.watch('type') === 'none'}
              >
                Reset to default
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
