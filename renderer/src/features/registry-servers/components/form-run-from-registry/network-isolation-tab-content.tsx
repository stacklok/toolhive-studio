import { Controller } from 'react-hook-form'
import { Switch } from '@/common/components/ui/switch'
import { Label } from '@/common/components/ui/label'
import { Alert, AlertDescription } from '@/common/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { DynamicArrayField } from '../dynamic-array-field'
import type { UseFormReturn } from 'react-hook-form'
import { type FormSchemaRunFromRegistry } from '../../lib/get-form-schema-run-from-registry'
import { AllowedProtocolsField } from './allowed-protocols-field'

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
        const protocols = form.watch('allowedProtocols') || []
        return (
          <div className="p-6">
            <div className="mb-4 flex items-center gap-4 rounded-md border px-3 py-4">
              <Switch
                id="network-isolation-switch"
                aria-label="Network isolation"
                checked={!!networkField.value}
                onCheckedChange={networkField.onChange}
              />
              <Label htmlFor="network-isolation-switch">
                Network isolation
              </Label>
            </div>
            {networkField.value && (
              <>
                {/* Show alert only if any of the three are empty, and place it below the switch */}
                {(!hosts.length || !ports.length || !protocols.length) && (
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
                      /*
                         // @ts-expect-error no time to fix this */
                      name="allowedHosts"
                      label="Allowed Hosts"
                      inputLabelPrefix="Host"
                      addButtonText="Add a host"
                      control={form.control}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="allowedPorts"
                  render={() => (
                    <DynamicArrayField<FormSchemaRunFromRegistry>
                      /*
                         // @ts-expect-error no time to fix this */
                      name={'allowedPorts'}
                      label="Allowed Ports"
                      control={form.control}
                      inputLabelPrefix="Port"
                      addButtonText="Add a port"
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="allowedProtocols"
                  render={({ field }) => (
                    <AllowedProtocolsField
                      field={
                        field as {
                          value?: string[]
                          onChange: (value: string[]) => void
                        }
                      }
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
