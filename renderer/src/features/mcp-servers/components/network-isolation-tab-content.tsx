import { Controller } from 'react-hook-form'
import { Switch } from '@/common/components/ui/switch'
import { Label } from '@/common/components/ui/label'
import { Alert, AlertDescription } from '@/common/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { DynamicArrayField } from '../../registry-servers/components/dynamic-array-field'
import type {
  ControllerRenderProps,
  Path,
  UseFormReturn,
} from 'react-hook-form'
import { FormControl, FormField, FormItem } from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import type { FormSchemaLocalMcp } from '../lib/form-schema-local-mcp'

export function NetworkIsolationTabContent({
  form,
}: {
  form: UseFormReturn<FormSchemaLocalMcp>
}) {
  return (
    <Controller
      control={form.control}
      name="networkIsolation"
      render={({ field: networkField }) => {
        const hosts = form.watch('allowedHosts') || []
        const ports = form.watch('allowedPorts') || []
        const showAlert =
          !hosts.some((host) => host.value.trim() !== '') &&
          !ports.some((port) => port.value.trim() !== '')
        return (
          <div className="p-6">
            <div
              className="mb-4 flex items-center gap-4 rounded-md border px-3
                py-4"
            >
              <Switch
                id="network-isolation-switch"
                aria-label="Enable outbound network filtering"
                checked={!!networkField.value}
                onCheckedChange={networkField.onChange}
              />
              <Label htmlFor="network-isolation-switch">
                Enable outbound network filtering
              </Label>
            </div>
            {networkField.value && (
              <>
                {showAlert && (
                  <Alert className="mt-2">
                    <AlertTriangle className="mt-0.5" />
                    <AlertDescription>
                      This configuration blocks all outbound network traffic
                      from the MCP server.
                    </AlertDescription>
                  </Alert>
                )}
                <Controller
                  control={form.control}
                  name="allowedHosts"
                  render={() => (
                    <DynamicArrayField<FormSchemaLocalMcp>
                      name="allowedHosts"
                      label="Allowed hosts"
                      inputLabelPrefix="Host"
                      addButtonText="Add a host"
                      gridConfig="grid-cols-[minmax(0,1fr)_auto]"
                      tooltipContent={`Specify domain names or IP addresses. To include subdomains, use a leading period (".")`}
                      form={form}
                    >
                      {({
                        fieldProps,
                        inputProps,
                        setInputRef,
                        idx,
                        message,
                      }) => (
                        <FormField
                          {...fieldProps}
                          render={({
                            field,
                          }: {
                            field: ControllerRenderProps<
                              FormSchemaLocalMcp,
                              Path<FormSchemaLocalMcp>
                            >
                          }) => (
                            <FormItem className="flex-grow">
                              <FormControl className="w-full">
                                <Input
                                  {...field}
                                  {...inputProps}
                                  type="string"
                                  ref={setInputRef(idx)}
                                  aria-label={`Host ${idx + 1}`}
                                  className="min-w-0 grow"
                                  value={field.value as string}
                                />
                              </FormControl>
                              {message}
                            </FormItem>
                          )}
                        />
                      )}
                    </DynamicArrayField>
                  )}
                />
                <Controller
                  control={form.control}
                  name="allowedPorts"
                  render={() => (
                    <DynamicArrayField<FormSchemaLocalMcp>
                      name="allowedPorts"
                      label="Allowed ports"
                      inputLabelPrefix="Port"
                      addButtonText="Add a port"
                      gridConfig="grid-cols-[minmax(0,1fr)_auto]"
                      form={form}
                    >
                      {({
                        fieldProps,
                        inputProps,
                        setInputRef,
                        idx,
                        message,
                      }) => (
                        <FormField
                          {...fieldProps}
                          render={({
                            field,
                          }: {
                            field: ControllerRenderProps<
                              FormSchemaLocalMcp,
                              Path<FormSchemaLocalMcp>
                            >
                          }) => (
                            <FormItem className="flex-grow">
                              <FormControl className="w-full">
                                <Input
                                  {...field}
                                  {...inputProps}
                                  type="number"
                                  ref={setInputRef(idx)}
                                  aria-label={`Port ${idx + 1}`}
                                  className="min-w-0 grow"
                                  value={field.value as string}
                                />
                              </FormControl>
                              {message}
                            </FormItem>
                          )}
                        />
                      )}
                    </DynamicArrayField>
                  )}
                />
              </>
            )}
          </div>
        )
      }}
    />
  )
}
