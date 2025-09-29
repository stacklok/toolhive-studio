import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { type UseFormReturn } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'
import { RadioGroup, RadioGroupItem } from '@/common/components/ui/radio-group'
import { CommandArgumentsField } from '@/common/components/workload-cmd-arg/command-arguments-field'
import type { FormSchemaLocalMcp } from '../../lib/form-schema-local-mcp'

export function FormFieldsBase<T extends FormSchemaLocalMcp>({
  form,
  isEditing = false,
  groupProps,
}: {
  form: UseFormReturn<T>
  isEditing?: boolean
  groupProps?: {
    show: boolean
    groups: Array<{ name?: string | null }>
  }
}) {
  const typeValue = form.watch('type')
  const protocolValue = form.watch('protocol') ?? 'npx'
  const transportValue = form.watch('transport')

  return (
    <>
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem className="mb-8">
            <FormLabel className="mb-2">Server type</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex gap-6"
              >
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem value="docker_image" />
                  </FormControl>
                  <FormLabel className="font-normal">Docker image</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem value="package_manager" />
                  </FormControl>
                  <FormLabel className="font-normal">Package manager</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1">
              <FormLabel>Server Name</FormLabel>
              <TooltipInfoIcon>
                The human-readable name you will use to identify this server.
              </TooltipInfoIcon>
            </div>
            <FormControl>
              <Input
                autoCorrect="off"
                autoComplete="off"
                autoFocus
                data-1p-ignore
                placeholder="e.g. my-awesome-server"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                name={field.name}
                disabled={isEditing}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {groupProps?.show && (
        // Inserted just under the Server Name field
        <FormField
          control={form.control}
          name={'group'}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor={field.name}>Group</FormLabel>
              <FormControl>
                <Select
                  onValueChange={(value) => field.onChange(value)}
                  value={field.value}
                  name={field.name}
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupProps.groups
                      .filter((g) => g.name)
                      .map((g) => (
                        <SelectItem key={g.name!} value={g.name!}>
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
      )}

      <FormField
        control={form.control}
        name="transport"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1">
              <FormLabel htmlFor={field.name}>Transport</FormLabel>
              <TooltipInfoIcon>
                The transport mechanism the MCP server uses to communicate with
                clients.
              </TooltipInfoIcon>
            </div>
            <FormControl>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  // Automatically set target_port to 0 for stdio transport
                  if (value === 'stdio') {
                    form.setValue('target_port', 0)
                  }
                }}
                value={field.value}
                name={field.name}
              >
                <SelectTrigger id={field.name} className="w-full">
                  <SelectValue placeholder="e.g. SSE, stdio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sse">SSE</SelectItem>
                  <SelectItem value="stdio">stdio</SelectItem>
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

      {/* Only show target_port for non-stdio transports */}
      {transportValue !== 'stdio' && (
        <FormField
          control={form.control}
          name="target_port"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel htmlFor={field.name}>Target port</FormLabel>
                <TooltipInfoIcon className="max-w-72">
                  Target port to expose from the container. If not specified,
                  ToolHive will automatically assign a random port.
                </TooltipInfoIcon>
              </div>
              <FormControl>
                <Input
                  id={field.name}
                  autoCorrect="off"
                  autoComplete="off"
                  autoFocus
                  type="number"
                  data-1p-ignore
                  placeholder="e.g. 50051"
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {typeValue === 'docker_image' ? (
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel>Docker image</FormLabel>
                <TooltipInfoIcon>
                  The Docker image that contains the MCP server.
                </TooltipInfoIcon>
              </div>
              <FormControl>
                <Input
                  placeholder="e.g. ghcr.io/acme-corp/my-awesome-server:latest"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {typeValue === 'package_manager' ? (
        <FormField
          control={form.control}
          name="protocol"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel htmlFor={field.name}>Protocol</FormLabel>
                <TooltipInfoIcon>
                  ToolHive supports running MCP servers directly from supported
                  package managers.
                </TooltipInfoIcon>
              </div>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  name={field.name}
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue placeholder="e.g. npx, uvx, go" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="npx">npx</SelectItem>
                    <SelectItem value="uvx">uvx</SelectItem>
                    <SelectItem value="go">go</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {typeValue === 'package_manager' ? (
        <FormField
          control={form.control}
          name="package_name"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel htmlFor={field.name}>Package name</FormLabel>
                <TooltipInfoIcon>
                  The name of the package to run the MCP server from.
                </TooltipInfoIcon>
              </div>
              <FormControl>
                <div className="flex items-center">
                  <div
                    className="bg-muted text-muted-foreground border-input flex
                      h-9 items-center rounded-l-md border border-r-0 px-2
                      text-sm shadow-xs"
                  >
                    {`${protocolValue}://`}
                  </div>
                  <Input
                    className="rounded-l-none"
                    placeholder="e.g. my-awesome-server@latest"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    name={field.name}
                    id={field.name}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <CommandArgumentsField
        getValues={(name) => form.getValues(name)}
        setValue={(name, value) => form.setValue(name, value)}
        control={form.control}
      />
    </>
  )
}
