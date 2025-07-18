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
import { AlertErrorFormSubmission } from '../alert-error-form-submission'
import type { UseFormReturn } from 'react-hook-form'
import type { FormSchemaRunFromRegistry } from '../../lib/get-form-schema-run-from-registry'
import type { GroupedEnvVars } from '../../lib/group-env-vars'
import type { RegistryEnvVar } from '@/common/api/generated/types.gen'
import { cn } from '@/common/lib/utils'
import { FormComboboxSecretStore } from '@/common/components/secrets/form-combobox-secrets-store'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'

interface ConfigurationTabContentProps {
  error: string | null
  isErrorSecrets: boolean
  setError: (err: string | null) => void
  form: UseFormReturn<FormSchemaRunFromRegistry>
  groupedEnvVars: GroupedEnvVars
}

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
                  className="rounded-tr-none rounded-br-none border-r-0
                    font-mono focus-visible:z-10"
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
  error,
  isErrorSecrets,
  setError,
  form,
  groupedEnvVars,
}: ConfigurationTabContentProps) {
  return (
    <div className="relative max-h-[65dvh] space-y-4 overflow-y-auto px-6">
      {error && (
        <AlertErrorFormSubmission
          error={error}
          isErrorSecrets={isErrorSecrets}
          onDismiss={() => setError(null)}
        />
      )}
      <FormField
        control={form.control}
        name="serverName"
        render={({ field }) => (
          <FormItem className="mb-10">
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
