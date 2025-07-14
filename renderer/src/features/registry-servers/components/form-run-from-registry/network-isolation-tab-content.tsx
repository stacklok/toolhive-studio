import { Controller } from 'react-hook-form'
import { Switch } from '@/common/components/ui/switch'
import { Label } from '@/common/components/ui/label'
import { Alert, AlertDescription } from '@/common/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { DynamicArrayField } from '../dynamic-array-field'
import React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { FormSchemaRunFromRegistry } from '../../lib/get-form-schema-run-from-registry'

const validatePort = (val: string) => {
  if (!val.trim()) return 'Port is required'
  if (!/^[0-9]+$/.test(val)) return 'Port must be a number'
  const num = Number(val)
  if (isNaN(num) || num < 1 || num > 65535) return 'Port must be 1-65535'
  return null
}

const validateHost = (val: string) => {
  if (!val.trim()) return 'Host is required'
  if (!/^\.?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(val)) return 'Invalid host'
  return null
}

export function NetworkIsolationTabContent({
  form,
}: {
  form: UseFormReturn<
    FormSchemaRunFromRegistry & {
      networkIsolation?: boolean
      allowedProtocols?: string[]
      allowedPorts?: string[]
      allowedHosts?: string[]
    }
  >
}) {
  return (
    <Controller
      control={form.control}
      name="networkIsolation"
      render={({ field: networkField }) => (
        <div className="p-6">
          <div className="mb-4 flex items-center gap-4">
            <Switch
              id="network-isolation-switch"
              aria-label="Network isolation"
              checked={!!networkField.value}
              onCheckedChange={networkField.onChange}
            />
            <Label htmlFor="network-isolation-switch">Network isolation</Label>
          </div>
          {networkField.value && (
            <>
              <Alert className="mt-2">
                <AlertTriangle className="mt-0.5" />
                <AlertDescription>
                  This configuration blocks all outbound network traffic from
                  the MCP server.
                </AlertDescription>
              </Alert>
              {/* Allowed Protocols */}
              <Controller
                control={form.control}
                name="allowedProtocols"
                render={({ field: protocolsField }) => (
                  <div className="mt-6">
                    <Label htmlFor="allowed-protocols-group">
                      Allowed Protocols
                    </Label>
                    <div
                      id="allowed-protocols-group"
                      role="group"
                      aria-label="Allowed Protocols"
                    >
                      <div className="mt-2 flex items-center gap-4">
                        <label>
                          <input
                            type="checkbox"
                            aria-label="TCP"
                            checked={
                              protocolsField.value?.includes('TCP') || false
                            }
                            onChange={() => {
                              if (protocolsField.value?.includes('TCP')) {
                                protocolsField.onChange(
                                  protocolsField.value.filter(
                                    (v: string) => v !== 'TCP'
                                  )
                                )
                              } else {
                                protocolsField.onChange([
                                  ...(protocolsField.value || []),
                                  'TCP',
                                ])
                              }
                            }}
                          />{' '}
                          TCP
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            aria-label="UDP"
                            checked={
                              protocolsField.value?.includes('UDP') || false
                            }
                            onChange={() => {
                              if (protocolsField.value?.includes('UDP')) {
                                protocolsField.onChange(
                                  protocolsField.value.filter(
                                    (v: string) => v !== 'UDP'
                                  )
                                )
                              } else {
                                protocolsField.onChange([
                                  ...(protocolsField.value || []),
                                  'UDP',
                                ])
                              }
                            }}
                          />{' '}
                          UDP
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name="allowedPorts"
                render={({ field: portsField }) => (
                  <DynamicArrayField
                    label="Allowed Ports"
                    value={portsField.value || []}
                    onChange={portsField.onChange}
                    inputLabelPrefix="Port"
                    addButtonText="Add a port"
                    validate={validatePort}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="allowedHosts"
                render={({ field: hostsField }) => (
                  <DynamicArrayField
                    label="Allowed Hosts"
                    value={hostsField.value || []}
                    onChange={hostsField.onChange}
                    inputLabelPrefix="Host"
                    addButtonText="Add a host"
                    validate={validateHost}
                  />
                )}
              />
            </>
          )}
        </div>
      )}
    />
  )
}
