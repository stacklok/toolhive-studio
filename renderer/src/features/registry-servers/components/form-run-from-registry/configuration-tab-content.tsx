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
import { SecretRow, EnvVarRow } from './index'

export interface ConfigurationTabContentProps {
  error: string | null
  isErrorSecrets: boolean
  setError: (err: string | null) => void
  form: UseFormReturn<FormSchemaRunFromRegistry>
  groupedEnvVars: GroupedEnvVars
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
