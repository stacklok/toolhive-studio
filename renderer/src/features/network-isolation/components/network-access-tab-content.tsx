import { Controller } from 'react-hook-form'
import type {
  ArrayPath,
  ControllerRenderProps,
  FieldValues,
  Path,
  UseFormReturn,
} from 'react-hook-form'
import { RadioGroup, RadioGroupItem } from '@/common/components/ui/radio-group'
import { Label } from '@/common/components/ui/label'
import { Checkbox } from '@/common/components/ui/checkbox'
import { Alert, AlertDescription } from '@/common/components/ui/alert'
import { AlertTriangle, InfoIcon } from 'lucide-react'
import { DynamicArrayField } from '../../registry-servers/components/dynamic-array-field'
import { FormControl, FormField, FormItem } from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import {
  ALLOWED_DESTINATIONS,
  NETWORK_ACCESS_MODES,
  type AllowedDestinations,
  type NetworkAccessMode,
} from '@/common/lib/form-schema-mcp'

type NetworkAccessFormValues = FieldValues & {
  networkAccess: NetworkAccessMode
  allowedDestinations: AllowedDestinations
  allowHostAccess?: boolean
  allowedHosts?: Array<{ value: string }>
  allowedPorts?: Array<{ value: string }>
}

export function NetworkAccessTabContent<
  TFieldValues extends NetworkAccessFormValues,
>({ form }: { form: UseFormReturn<TFieldValues> }) {
  const networkAccess = form.watch(
    'networkAccess' as Path<TFieldValues>
  ) as NetworkAccessMode
  const allowedDestinations = form.watch(
    'allowedDestinations' as Path<TFieldValues>
  ) as AllowedDestinations
  const hosts = form.watch('allowedHosts' as Path<TFieldValues>) as
    Array<{ value: string }> | undefined
  const ports = form.watch('allowedPorts' as Path<TFieldValues>) as
    Array<{ value: string }> | undefined
  const showEmptyAllowListWarning =
    allowedDestinations === ALLOWED_DESTINATIONS.Selected &&
    !hosts?.some((host) => host.value.trim() !== '') &&
    !ports?.some((port) => port.value.trim() !== '')

  return (
    <div className="p-6">
      <Label className="mb-4 block">Network access</Label>
      <Controller
        control={form.control}
        name={'networkAccess' as Path<TFieldValues>}
        render={({ field }) => (
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className="mb-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value={NETWORK_ACCESS_MODES.None}
                id="network-access-none"
              />
              <Label htmlFor="network-access-none" className="font-normal">
                No isolation
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value={NETWORK_ACCESS_MODES.Host}
                id="network-access-host"
              />
              <Label htmlFor="network-access-host" className="font-normal">
                Host networking (Advanced)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value={NETWORK_ACCESS_MODES.Proxy}
                id="network-access-proxy"
              />
              <Label htmlFor="network-access-proxy" className="font-normal">
                Isolate behind an HTTP proxy
              </Label>
            </div>
          </RadioGroup>
        )}
      />

      {networkAccess === NETWORK_ACCESS_MODES.Host && (
        <Alert>
          <InfoIcon className="mt-0.5" />
          <AlertDescription>
            The server&apos;s container shares the host machine&apos;s network
            namespace directly. No egress filtering is applied in this mode.
          </AlertDescription>
        </Alert>
      )}

      {networkAccess === NETWORK_ACCESS_MODES.Proxy && (
        <>
          <Alert className="mb-6">
            <InfoIcon className="mt-0.5" />
            <AlertDescription>
              <p>
                <strong>HTTP(S) only</strong>: to allow other protocols, choose
                &quot;No isolation&quot;.
              </p>
            </AlertDescription>
          </Alert>

          <Controller
            control={form.control}
            name={'allowedDestinations' as Path<TFieldValues>}
            render={({ field }) => (
              <div className="mb-6">
                <Label className="mb-4 block">Allowed destinations</Label>
                <RadioGroup onValueChange={field.onChange} value={field.value}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={ALLOWED_DESTINATIONS.Anywhere}
                      id="allowed-destinations-anywhere"
                    />
                    <Label
                      htmlFor="allowed-destinations-anywhere"
                      className="font-normal"
                    >
                      Anywhere
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={ALLOWED_DESTINATIONS.Selected}
                      id="allowed-destinations-selected"
                    />
                    <Label
                      htmlFor="allowed-destinations-selected"
                      className="font-normal"
                    >
                      Selected destinations
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          />

          {allowedDestinations === ALLOWED_DESTINATIONS.Selected && (
            <>
              {showEmptyAllowListWarning && (
                <Alert className="mb-2">
                  <AlertTriangle className="mt-0.5" />
                  <AlertDescription>
                    This configuration blocks all outbound network traffic from
                    the MCP server.
                  </AlertDescription>
                </Alert>
              )}
              <Controller
                control={form.control}
                name={'allowedHosts' as Path<TFieldValues>}
                render={() => (
                  <DynamicArrayField<TFieldValues>
                    name={'allowedHosts' as ArrayPath<TFieldValues>}
                    gridConfig="grid-cols-[minmax(0,1fr)_auto]"
                    label="Allowed hosts"
                    inputLabelPrefix="Host"
                    addButtonText="Add a host"
                    tooltipContent={`Specify domain names. To include subdomains, use a leading period (".")`}
                    collapseWhenEmpty
                    form={form}
                    className="mt-6"
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
                            TFieldValues,
                            Path<TFieldValues>
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
                name={'allowedPorts' as Path<TFieldValues>}
                render={() => (
                  <DynamicArrayField<TFieldValues>
                    name={'allowedPorts' as ArrayPath<TFieldValues>}
                    gridConfig="grid-cols-[minmax(0,1fr)_auto]"
                    label="Allowed ports"
                    inputLabelPrefix="Port"
                    addButtonText="Add a port"
                    collapseWhenEmpty
                    form={form}
                    className="mt-6"
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
                            TFieldValues,
                            Path<TFieldValues>
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

          <Controller
            control={form.control}
            name={'allowHostAccess' as Path<TFieldValues>}
            render={({ field }) => (
              <div className="mt-6 flex items-start gap-2">
                <Checkbox
                  id="allow-host-access"
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="allow-host-access" className="font-normal">
                    Allow host machine access
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Only if this server talks to an HTTP service on your
                    computer, like a local dev server.
                  </p>
                </div>
              </div>
            )}
          />
        </>
      )}
    </div>
  )
}
