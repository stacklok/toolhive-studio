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
import { Button } from '@/common/components/ui/button'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import type { GroupedEnvVars } from '../../lib/group-env-vars'
import type { RegistryEnvVar } from '@common/api/registry-types'
import { cn } from '@/common/lib/utils'
import { SecretStoreCombobox } from '@/common/components/secrets/secret-store-combobox'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'
import { CommandArgumentsField } from '@/common/components/workload-cmd-arg/command-arguments-field'
import { FormFieldsArrayVolumes } from '@/features/mcp-servers/components/form-fields-array-custom-volumes'
import { FormFieldsProxy } from '@/common/components/workloads/form-fields-proxy'
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

  const predefinedSecretsCount = groupedEnvVars.secrets.length
  const predefinedEnvVarsCount = groupedEnvVars.envVars.length

  const {
    fields: secretFields,
    append: appendSecret,
    remove: removeSecret,
  } = useFieldArray({
    control: form.control,
    name: 'secrets',
  })

  const {
    fields: envVarFields,
    append: appendEnvVar,
    remove: removeEnvVar,
  } = useFieldArray({
    control: form.control,
    name: 'envVars',
  })

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

      <FormFieldsProxy<FormSchemaRegistryMcp> control={form.control} />

      <CommandArgumentsField<FormSchemaRegistryMcp>
        getValues={(name) => form.getValues(name)}
        setValue={(name, value) => form.setValue(name, value)}
        control={form.control}
      />

      <FormFieldsArrayVolumes<FormSchemaRegistryMcp> form={form} />

      <section className="mb-6">
        <Label className="mb-2">Secrets</Label>
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

        {secretFields.slice(predefinedSecretsCount).map((field, relIdx) => {
          const index = predefinedSecretsCount + relIdx
          return (
            <div
              key={field.id}
              className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-4"
            >
              <FormField
                control={form.control}
                name={`secrets.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        className="font-mono"
                        placeholder="e.g. API_KEY"
                        aria-label={`Secret name ${relIdx + 1}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`secrets.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <div
                      className="grid grid-cols-[auto_calc(var(--spacing)_*_9)]"
                    >
                      <FormControl>
                        <Input
                          type="password"
                          className="rounded-tr-none rounded-br-none border-r-0
                            font-mono focus-visible:z-10"
                          autoComplete="off"
                          data-1p-ignore
                          value={
                            field.value.isFromStore
                              ? 'foo-bar-123-xzy'
                              : field.value.secret
                          }
                          onChange={(e) =>
                            field.onChange({
                              secret: e.target.value,
                              isFromStore: false,
                            })
                          }
                          aria-label={`Secret value ${relIdx + 1}`}
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
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Remove secret ${relIdx + 1}`}
                onClick={() => removeSecret(index)}
              >
                <Trash2 />
              </Button>
            </div>
          )
        })}

        <Button
          type="button"
          variant="secondary"
          className="mt-1 w-fit"
          onClick={() =>
            appendSecret({
              name: '',
              value: { secret: '', isFromStore: false },
            })
          }
        >
          <Plus />
          Add secret
        </Button>
      </section>

      <section className="mb-6">
        <Label className="mb-2">Environment variables</Label>
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

        {envVarFields.slice(predefinedEnvVarsCount).map((field, relIdx) => {
          const index = predefinedEnvVarsCount + relIdx
          return (
            <div
              key={field.id}
              className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-4"
            >
              <FormField
                control={form.control}
                name={`envVars.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        className="font-mono"
                        placeholder="e.g. DEBUG"
                        aria-label={`Environment variable name ${relIdx + 1}`}
                      />
                    </FormControl>
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
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        className="font-mono"
                        autoComplete="off"
                        data-1p-ignore
                        placeholder="e.g. 1"
                        aria-label={`Environment variable value ${relIdx + 1}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Remove environment variable ${relIdx + 1}`}
                onClick={() => removeEnvVar(index)}
              >
                <Trash2 />
              </Button>
            </div>
          )
        })}

        <Button
          type="button"
          variant="secondary"
          className="mt-1 w-fit"
          onClick={() => appendEnvVar({ name: '', value: '' })}
        >
          <Plus />
          Add environment variable
        </Button>
      </section>
    </div>
  )
}
