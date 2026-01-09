import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormControl,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import type { UseFormReturn } from 'react-hook-form'
import type { GroupedEnvVars } from '../../lib/group-env-vars'
import type { RegistryEnvVar } from '@api/types.gen'
import { cn } from '@/common/lib/utils'
import { SecretStoreCombobox } from '@/common/components/secrets/secret-store-combobox'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'
import { CommandArgumentsField } from '@/common/components/workload-cmd-arg/command-arguments-field'
import { FormFieldsArrayVolumes } from '@/features/mcp-servers/components/form-fields-array-custom-volumes'
import type { FormSchemaRegistryMcp } from '../../lib/form-schema-registry-mcp'
import { useGroups } from '@/features/mcp-servers/hooks/use-groups'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'

interface ConfigurationTabContentProps {
  form: UseFormReturn<FormSchemaRegistryMcp>
  groupedEnvVars: GroupedEnvVars
}

function SecretRow({
  secret,
  form,
  index,
}: {
  secret: RegistryEnvVar
  form: UseFormReturn<FormSchemaRegistryMcp>
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
                <FormLabel
                  required={secret.required}
                  htmlFor={`secrets.${index}.value`}
                  className={cn(
                    `text-muted-foreground !border-input h-full items-center
                    font-mono !ring-0`
                  )}
                >
                  {secret.name}
                  <TooltipInfoIcon className="m-w-90">
                    {secret.description}
                  </TooltipInfoIcon>
                </FormLabel>
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`secrets.${index}.value`}
        render={({ field }) => (
          <FormItem>
            <div className="grid grid-cols-[auto_calc(var(--spacing)_*_9)]">
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
                  className="rounded-tr-none rounded-br-none border-r-0
                    font-mono focus-visible:z-10"
                  autoComplete="off"
                  data-1p-ignore
                  type="password"
                  aria-label={`${secret.name ?? ''} value`}
                />
              </FormControl>
              <SecretStoreCombobox
                value={field.value.secret}
                onChange={(secretKey) =>
                  field.onChange({
                    secret: secretKey,
                    isFromStore: true,
                  })
                }
              />
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function EnvVarRow({
  envVar,
  form,
  index,
}: {
  envVar: RegistryEnvVar
  form: UseFormReturn<FormSchemaRegistryMcp>
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
                <FormLabel
                  required={envVar.required}
                  htmlFor={`envVar.${index}.value`}
                  className={cn(
                    `text-muted-foreground !border-input flex h-full
                    items-center gap-2 font-mono !ring-0`
                  )}
                >
                  {envVar.name}
                  <TooltipInfoIcon className="w-90">
                    {envVar.description}
                  </TooltipInfoIcon>
                </FormLabel>
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

export function ConfigurationTabContent({
  form,
  groupedEnvVars,
}: ConfigurationTabContentProps) {
  const { data: groupsData } = useGroups()
  const groups = groupsData?.groups ?? []

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-6">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Server name</FormLabel>
            <FormDescription>
              Choose a unique name for this server instance
            </FormDescription>
            <FormControl>
              <Input {...field} placeholder="e.g. my-custom-server" autoFocus />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="group"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor={field.name}>Group</FormLabel>
            <FormControl>
              <Select
                value={field.value || 'default'}
                onValueChange={(v) => field.onChange(v)}
                name={field.name}
              >
                <SelectTrigger
                  id={field.name}
                  aria-label="Group"
                  className="w-full"
                >
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups
                    .filter((g) => g.name)
                    .map((g) => (
                      <SelectItem key={g.name} value={g.name!}>
                        {g.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="proxy_mode"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1">
              <FormLabel htmlFor={field.name}>Proxy Mode</FormLabel>
              <TooltipInfoIcon>
                The proxy mode that clients should use to connect.
              </TooltipInfoIcon>
            </div>
            <FormControl>
              <Select
                onValueChange={(value) => field.onChange(value)}
                value={field.value}
                name={field.name}
              >
                <SelectTrigger id={field.name} className="w-full">
                  <SelectValue placeholder="e.g. SSE, Streamable HTTP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sse">SSE</SelectItem>
                  <SelectItem value="streamable-http">
                    Streamable HTTP
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="proxy_port"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1">
              <FormLabel htmlFor={field.name}>Proxy Port</FormLabel>
              <TooltipInfoIcon className="max-w-72">
                Port for the HTTP proxy to listen on. If not specified, ToolHive
                will automatically assign a random port.
              </TooltipInfoIcon>
            </div>
            <FormControl>
              <Input
                id={field.name}
                autoCorrect="off"
                autoComplete="off"
                type="number"
                data-1p-ignore
                placeholder="Leave empty for random port"
                value={field.value ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  field.onChange(value === '' ? undefined : parseInt(value, 10))
                }}
                name={field.name}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <CommandArgumentsField<FormSchemaRegistryMcp>
        getValues={(name) => form.getValues(name)}
        setValue={(name, value) => form.setValue(name, value)}
        control={form.control}
      />

      <FormFieldsArrayVolumes<FormSchemaRegistryMcp> form={form} />

      {groupedEnvVars.secrets[0] ? (
        <section className="mb-6">
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
        <section className="mb-6">
          <Label className="mb-2" htmlFor="envVars.0.value">
            Environment variables
          </Label>

          <p className="text-muted-foreground mb-6 text-sm">
            Environment variables are used to pass configuration settings to the
            server.
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
  )
}
