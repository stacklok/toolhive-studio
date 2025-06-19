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
  RegistryServer,
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
import { ComboboxSecretStore } from '@/common/components/secrets/combobox-secrets-store'

/**
 * Renders an asterisk icon & tooltip for required fields.
 * NOTE: USes absolute positioning & assumes that it is being rendered inside a container with `position: relative`.
 */
function TooltipValueRequired() {
  return (
    <Tooltip>
      <TooltipTrigger asChild autoFocus={false}>
        <AsteriskIcon className="text-muted-foreground absolute top-2 right-2 size-5 rounded-full px-0.5" />
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
        render={({ field }) => (
          <FormItem>
            <div className="relative">
              <FormControl>
                <Input
                  {...field}
                  autoComplete="off"
                  className={cn(
                    'text-muted-foreground !border-input font-mono !ring-0',
                    secret.required ? 'pr-8' : ''
                  )}
                  aria-label={secret.name ?? ''}
                  readOnly
                />
              </FormControl>
              {secret.required && <TooltipValueRequired />}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`secrets.${index}.value`}
        render={({ field }) => (
          <FormItem className="grid grid-cols-[auto_calc(var(--spacing)_*_8)]">
            <FormControl>
              <Input
                {...field}
                className="rounded-tr-none rounded-br-none border-r-0 font-mono focus-visible:z-10"
                autoComplete="off"
                data-1p-ignore
                type="password"
                aria-label={`${secret.name ?? ''} value`}
              />
            </FormControl>
            <ComboboxSecretStore
              onSelect={field.onChange}
              value={field.value ?? ''}
            />
            <FormMessage />
          </FormItem>
        )}
      />
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
        render={({ field }) => (
          <FormItem>
            <div className="relative">
              <FormControl>
                <Input
                  {...field}
                  autoComplete="off"
                  className={cn(
                    'text-muted-foreground !border-input font-mono !ring-0',
                    envVar.required ? 'pr-8' : ''
                  )}
                  aria-label={envVar.name ?? ''}
                  readOnly
                />
              </FormControl>
              {envVar.required && <TooltipValueRequired />}
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

interface FormCatalogCreationProps {
  server: RegistryServer | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: FormSchemaRunFromRegistry) => void
}

export function FormCatalogCreation({
  server,
  isOpen,
  onOpenChange,
  onSubmit,
}: FormCatalogCreationProps) {
  const groupedEnvVars = useMemo(
    () => groupEnvVars(server?.env_vars || []),
    [server?.env_vars]
  )
  const formSchema = useMemo(
    () => getFormSchemaRunFromRegistry(groupedEnvVars),
    [groupedEnvVars]
  )

  const form = useForm<FormSchemaRunFromRegistry>({
    resolver: zodV4Resolver(formSchema),
    defaultValues: {
      serverName: server?.name || '',
      secrets: groupedEnvVars.secrets.map((s) => ({
        name: s.name || '',
        value: s.default || '',
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
            onSubmit={form.handleSubmit(onValidate)}
            className="mx-auto flex h-full w-full max-w-3xl flex-col"
          >
            <DialogHeader className="flex-shrink-0 px-6 pt-6">
              <DialogTitle>Configure {server.name}</DialogTitle>
              <DialogDescription>
                Set up the environment variables and name for this server
                installation.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-6">
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

              {groupedEnvVars.secrets[0] ? (
                <section className="mb-10">
                  <Label className="mb-4">Secrets</Label>

                  <p className="text-muted-foreground mb-6 text-sm">
                    Sensitive values that should not be exposed in plain text.
                    They are typically used for API keys, tokens, or passwords.
                    All secrets are encrypted and stored securely by ToolHive,
                    and{' '}
                    <span className="text-foreground font-semibold">never</span>{' '}
                    leave your machine.
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
                  <Label className="mb-4">Environment variables</Label>

                  <p className="text-muted-foreground mb-6 text-sm">
                    Non-sensitive values that can be used to configure the
                    server. These variables are not encrypted and can be exposed
                    in plain text. They are typically used for configuration
                    options that do not contain sensitive information.
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
