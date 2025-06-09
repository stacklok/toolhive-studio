import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { Switch } from '@/common/components/ui/switch'
import { useForm } from 'react-hook-form'
import type { RegistryServer } from '@/common/api/generated/types.gen'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { z } from 'zod/v4'

const formCatalogCreationSchema = z.object({
  serverName: z.string().min(1, 'Server name is required'),
  envVars: z.array(
    z.object({
      name: z.string(),
      value: z.string().optional(),
      useDefault: z.boolean().default(false),
    })
  ),
})

type FormCatalogCreationSchema = z.infer<typeof formCatalogCreationSchema>

interface FormCatalogCreationProps {
  server: RegistryServer | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    envVars: { name: string; value: string }[]
  }) => void
}

export function FormCatalogCreation({
  server,
  isOpen,
  onOpenChange,
  onSubmit,
}: FormCatalogCreationProps) {
  const form = useForm<FormCatalogCreationSchema>({
    resolver: zodV4Resolver(formCatalogCreationSchema),
    defaultValues: {
      serverName: server?.name || '',
      envVars:
        server?.env_vars?.map((envVar) => ({
          name: envVar.name || '',
          value: envVar.default || '',
          useDefault: !!envVar.default,
        })) || [],
    },
  })

  const handleSubmit = (data: FormCatalogCreationSchema) => {
    const envVarsToSubmit = data.envVars
      .filter((envVar) => envVar.value || !envVar.useDefault)
      .map((envVar) => ({
        name: envVar.name,
        value: envVar.value || '',
      }))

    onSubmit({
      name: data.serverName,
      envVars: envVarsToSubmit,
    })
    onOpenChange(false)
  }

  if (!server) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="m-0 h-screen max-h-none w-screen max-w-none min-w-full overflow-y-auto
          rounded-none"
      >
        <Form {...form} key={server?.name}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex h-full flex-col"
          >
            <DialogHeader className="flex-shrink-0 px-6 pt-6">
              <DialogTitle>Configure {server.name}</DialogTitle>
              <DialogDescription>
                Set up the environment variables and name for this server
                installation.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="serverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server Name</FormLabel>
                      <FormDescription>
                        Choose a unique name for this server instance
                      </FormDescription>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. my-custom-server"
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {server.env_vars && server.env_vars.length > 0 ? (
                  <>
                    <div className="border-t pt-6">
                      <h3 className="mb-4 text-lg font-medium">
                        Environment Variables
                      </h3>
                      <div className="space-y-4">
                        {server.env_vars.map((envVar, index) => (
                          <FormField
                            key={envVar.name || index}
                            control={form.control}
                            name={`envVars.${index}.value`}
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <FormLabel className="flex items-center gap-2">
                                      {envVar.name}
                                      {envVar.required && (
                                        <span className="text-xs text-red-500">
                                          *
                                        </span>
                                      )}
                                      {envVar.secret && (
                                        <span className="rounded bg-orange-100 px-1 text-xs text-orange-500">
                                          secret
                                        </span>
                                      )}
                                    </FormLabel>
                                    {envVar.description && (
                                      <FormDescription>
                                        {envVar.description}
                                      </FormDescription>
                                    )}
                                  </div>
                                  {envVar.default && (
                                    <div className="flex items-center gap-2">
                                      <FormField
                                        control={form.control}
                                        name={`envVars.${index}.useDefault`}
                                        render={({ field: switchField }) => (
                                          <FormItem className="flex items-center gap-2">
                                            <FormLabel className="text-muted-foreground text-sm">
                                              Use default
                                            </FormLabel>
                                            <FormControl>
                                              <Switch
                                                checked={switchField.value}
                                                onCheckedChange={(checked) => {
                                                  switchField.onChange(checked)
                                                  if (checked) {
                                                    form.setValue(
                                                      `envVars.${index}.value`,
                                                      envVar.default || ''
                                                    )
                                                  }
                                                }}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                  )}
                                </div>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type={envVar.secret ? 'password' : 'text'}
                                    placeholder={
                                      envVar.default
                                        ? `Default: ${envVar.default}`
                                        : 'Enter value...'
                                    }
                                    disabled={form.watch(
                                      `envVars.${index}.useDefault`
                                    )}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground border-t py-8 text-center">
                    <p>
                      This server doesn't require any environment variables.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex-shrink-0 px-6 pb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Install Server</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
