import { Controller } from 'react-hook-form'
import { Switch } from '@/common/components/ui/switch'
import { Label } from '@/common/components/ui/label'
import { Alert, AlertDescription } from '@/common/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { DynamicArrayField } from '../../registry-servers/components/dynamic-array-field'
import type { UseFormReturn } from 'react-hook-form'
import { type FormSchemaRunFromRegistry } from '../../registry-servers/lib/get-form-schema-run-from-registry'

export function NetworkIsolationTabContent({
  form,
}: {
  form: UseFormReturn<FormSchemaRunFromRegistry>
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
                    <DynamicArrayField<FormSchemaRunFromRegistry>
                      name="allowedHosts"
                      label="Allowed hosts"
                      inputLabelPrefix="Host"
                      addButtonText="Add a host"
                      tooltipContent="Specify domain names or IP addresses. To include subdomains, use a leading period (“.”)"
                      form={form}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="allowedPorts"
                  render={() => (
                    <DynamicArrayField<FormSchemaRunFromRegistry>
                      name="allowedPorts"
                      label="Allowed ports"
                      inputLabelPrefix="Port"
                      addButtonText="Add a port"
                      type="number"
                      form={form}
                    />
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
