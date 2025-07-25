import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { type FormSchemaRunMcpCommand } from '../lib/form-schema-run-mcp-server-with-command'
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

export function FormFieldsRunMcpCommand({
  form,
}: {
  form: UseFormReturn<FormSchemaRunMcpCommand>
}) {
  const typeValue = form.watch('type')
  const protocolValue = form.watch('protocol') ?? 'npx'

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
                defaultValue={field.value}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="docker_image" id="docker_image" />
                  <label
                    htmlFor="docker_image"
                    className="text-sm leading-none font-medium
                      peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Docker image
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="package_manager"
                    id="package_manager"
                  />
                  <label
                    htmlFor="package_manager"
                    className="text-sm leading-none font-medium
                      peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Package manager
                  </label>
                </div>
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
              <FormLabel>Name</FormLabel>
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
                defaultValue={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                name={field.name}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

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
                onValueChange={field.onChange}
                defaultValue={field.value}
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
                defaultValue={field.value}
                onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                name={field.name}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

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
                  defaultValue={field.value}
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
                  defaultValue={field.value}
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
                    defaultValue={field.value}
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
