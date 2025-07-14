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
import { Tabs, TabsList, TabsTrigger } from '@/common/components/ui/tabs'

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
          <Tabs
            defaultValue={field.value}
            onValueChange={field.onChange}
            className="w-full"
          >
            <TabsList id={field.name} className="grid w-full grid-cols-2">
              <TabsTrigger value="docker_image">Docker image</TabsTrigger>
              <TabsTrigger value="package_manager">Package manager</TabsTrigger>
            </TabsList>
          </Tabs>
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
                    className="bg-muted text-muted-foreground border-input flex h-9 items-center rounded-l-md
                      border border-r-0 px-2 text-sm shadow-xs"
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

      <FormField
        control={form.control}
        name="cmd_arguments"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1">
              <FormLabel>Command arguments</FormLabel>
              <TooltipInfoIcon>
                Space separated arguments for the command.
              </TooltipInfoIcon>
            </div>
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
    </>
  )
}
