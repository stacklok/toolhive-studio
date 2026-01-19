import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'
import {
  useWatch,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form'
import { REMOTE_MCP_AUTH_TYPES } from '@/common/lib/form-schema-mcp'

type ProxyFields = {
  proxy_mode?: 'sse' | 'streamable-http'
  proxy_port?: number
}

interface FormFieldsProxyProps<T extends FieldValues & ProxyFields> {
  control: Control<T>
}

export function FormFieldsProxy<T extends FieldValues & ProxyFields>({
  control,
}: FormFieldsProxyProps<T>) {
  // proxy_mode is only configurable for stdio transport (non-BearerToken auth).
  // For other transports, proxy_mode matches the transport value automatically.

  const authType = useWatch({ control, name: 'auth_type' as Path<T> })
  const transport = useWatch({ control, name: 'transport' as Path<T> })

  const showProxyMode =
    authType !== REMOTE_MCP_AUTH_TYPES.BearerToken && transport === 'stdio'

  return (
    <>
      {showProxyMode && (
        <FormField
          control={control}
          name={'proxy_mode' as Path<T>}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel htmlFor={field.name}>Proxy mode</FormLabel>
                <TooltipInfoIcon>
                  The proxy transport mode that clients should use to connect to
                  this server.
                </TooltipInfoIcon>
              </div>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  name={field.name}
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue placeholder="Select proxy mode" />
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
      )}

      <FormField
        control={control}
        name={'proxy_port' as Path<T>}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1">
              <FormLabel htmlFor={field.name}>Proxy port</FormLabel>
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
    </>
  )
}
