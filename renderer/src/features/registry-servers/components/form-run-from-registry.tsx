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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { useForm, type UseFormReturn } from 'react-hook-form'
import type {
  RegistryEnvVar,
  RegistryImageMetadata,
} from '@/common/api/generated/types.gen'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useMemo } from 'react'
import { Label } from '@/common/components/ui/label'
import { cn } from '@/common/lib/utils'
import { AsteriskIcon } from 'lucide-react'
import { groupEnvVars } from '../lib/group-env-vars'
import {
  getFormSchemaRunFromRegistry,
  type FormSchemaRunFromRegistry,
} from '../lib/get-form-schema-run-from-registry'
import { FormComboboxSecretStore } from '@/common/components/secrets/form-combobox-secrets-store'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@/common/api/generated/@tanstack/react-query.gen'

/**
 * Renders an asterisk icon & tooltip for required fields.
 * NOTE: USes absolute positioning & assumes that it is being rendered inside a container with `position: relative`.
 */
function TooltipValueRequired() {
  return (
    <Tooltip>
      <TooltipTrigger asChild autoFocus={false}>
        <AsteriskIcon className="text-muted-foreground size-4" />
      </TooltipTrigger>
      <TooltipContent>Required</TooltipContent>
    </Tooltip>
  )
}

/**
 * A row containing the key/value pair for a SECRET.
 * Also composes the UI to load in a previously saved secret.
 */
function SecretRow({
  secret,
  form,
  index,
}: {
  secret: RegistryEnvVar
  form: UseFormReturn<FormSchemaRunFromRegistry>
  index: number
}) {
  return (
    <div className="mb-2 grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name={`secrets.${index}.name`}
        render={() => (
          <FormItem>
            <div className="relative">
              <FormControl>
                <Label
                  htmlFor={`secrets.${index}.value`}
                  className={cn(
                    'text-muted-foreground !border-input h-full items-center font-mono !ring-0',
                    secret.required ? 'pr-8' : ''
                  )}
                >
                  <span>{secret.name}</span>
                  {secret.required && <TooltipValueRequired />}
                </Label>
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-[auto_calc(var(--spacing)_*_9)]">
        <FormField
          control={form.control}
          name={`secrets.${index}.value`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  id={`secrets.${index}.value`}
                  onBlur={field.onBlur}
                  value={
                    field.value.isFromStore
                      ? 'foo-bar-123-xzy'
                      : field.value.secret
                  }
                  disabled={field.disabled}
                  name={field.name}
                  ref={field.ref}
                  onChange={(e) =>
                    field.onChange({
                      secret: e.target.value,
                      isFromStore: false,
                    })
                  }
                  className="rounded-tr-none rounded-br-none border-r-0 font-mono focus-visible:z-10"
                  autoComplete="off"
                  data-1p-ignore
                  type="password"
                  aria-label={`${secret.name ?? ''} value`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormComboboxSecretStore<FormSchemaRunFromRegistry>
          form={form}
          name={`secrets.${index}.value`}
        />
      </div>
    </div>
  )
}

/**
 * A row containing the key/value pair for an ENV VAR.
 */
function EnvVarRow({
  envVar,
  form,
  index,
}: {
  envVar: RegistryEnvVar
  form: UseFormReturn<FormSchemaRunFromRegistry>
  index: number
}) {
  return (
    <div className="mb-2 grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name={`envVars.${index}.name`}
        render={() => (
          <FormItem>
            <div className="relative">
              <FormControl>
                <Label
                  htmlFor={`envVar.${index}.value`}
                  className={cn(
                    `text-muted-foreground !border-input flex h-full items-center gap-1 font-mono
                    !ring-0`
                  )}
                >
                  <span>{envVar.name}</span>
                  {envVar.required && <TooltipValueRequired />}
                </Label>
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`envVars.${index}.value`}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                className="font-mono"
                autoComplete="off"
                data-1p-ignore
                id={`envVars.${index}.value`}
                aria-label={`${envVar.name ?? ''} value`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

interface FormRunFromRegistryProps {
  server: RegistryImageMetadata | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: FormSchemaRunFromRegistry) => void
}

export function FormRunFromRegistry({
  server,
  isOpen,
  onOpenChange,
  onSubmit,
}: FormRunFromRegistryProps) {
  const groupedEnvVars = useMemo(
    () => groupEnvVars(server?.env_vars || []),
    [server?.env_vars]
  )

  const { data } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
  })

  const formSchema = useMemo(
    () =>
      getFormSchemaRunFromRegistry({
        envVars: groupedEnvVars.envVars,
        secrets: groupedEnvVars.secrets,
        workloads: data?.workloads ?? [],
      }),
    [groupedEnvVars, data?.workloads]
  )

  const form = useForm<FormSchemaRunFromRegistry>({
    resolver: zodV4Resolver(formSchema),
    defaultValues: {
      serverName: server?.name || '',
      secrets: groupedEnvVars.secrets.map((s) => ({
        name: s.name || '',
        value: { secret: s.default || '', isFromStore: false },
      })),
      envVars: groupedEnvVars.envVars.map((e) => ({
        name: e.name || '',
        value: e.default || '',
      })),
    },
  })

  const onValidate = (data: FormSchemaRunFromRegistry) => {
    onSubmit(data)
    onOpenChange(false)
    form.reset()
  }

  if (!server) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 sm:max-w-2xl"
        onInteractOutside={(e) => {
          // Prevent closing the dialog when clicking outside
          e.preventDefault()
        }}
      >
        <Form {...form} key={server?.name}>
          <form
            onSubmit={form.handleSubmit(onValidate)}
            className="mx-auto flex h-full w-full max-w-3xl flex-col"
          >
            <DialogHeader className="mb-4 p-6">
              <DialogTitle>Configure {server.name}</DialogTitle>
              <DialogDescription>
                Set up the environment variables and name for this MCP server
                installation.
              </DialogDescription>
            </DialogHeader>

            <div className="relative max-h-[65dvh] space-y-4 overflow-y-auto px-6">
              <FormField
                control={form.control}
                name="serverName"
                render={({ field }) => (
                  <FormItem className="mb-10">
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

              <FormField
                control={form.control}
                name="cmd_arguments"
                render={({ field }) => (
                  <FormItem className="mb-10">
                    <FormLabel>Command arguments</FormLabel>
                    <FormDescription>
                      Space separated arguments for the command.
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="e.g. -y --oauth-setup"
                        defaultValue={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {groupedEnvVars.secrets[0] ? (
                <section className="mb-10">
                  <Label className="mb-2" htmlFor="secrets.0.value">
                    Secrets
                  </Label>

                  <p className="text-muted-foreground mb-6 text-sm">
                    All secrets are encrypted and securely stored by ToolHive.
                  </p>

                  {groupedEnvVars.secrets.map((secret, index) => (
                    <SecretRow
                      form={form}
                      secret={secret}
                      index={index}
                      key={secret.name}
                    />
                  ))}
                </section>
              ) : null}

              {groupedEnvVars.envVars[0] ? (
                <section className="mb-10">
                  <Label className="mb-2" htmlFor="envVars.0.value">
                    Environment variables
                  </Label>

                  <p className="text-muted-foreground mb-6 text-sm">
                    Environment variables are used to pass configuration
                    settings to the server.
                  </p>

                  {groupedEnvVars.envVars.map((envVar, index) => (
                    <EnvVarRow
                      form={form}
                      envVar={envVar}
                      index={index}
                      key={envVar.name}
                    />
                  ))}
                </section>
              ) : null}
            </div>

            <DialogFooter className="p-6">
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
