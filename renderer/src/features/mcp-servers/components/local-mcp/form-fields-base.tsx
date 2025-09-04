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

export function FormFieldsBase({
  form,
  isEditing = false,
}: {
  form: UseFormReturn<FormSchemaLocalMcp>
  isEditing?: boolean
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
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="docker_image" id="docker_image" />
                  <FormLabel htmlFor="docker_image">Docker image</FormLabel>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="package_manager"
                    id="package_manager"
                  />
                  <FormLabel htmlFor="package_manager">
                    Package manager
                  </FormLabel>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!isEditing && (
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Server name
                <TooltipInfoIcon>
                  A unique name to identify this server in ToolHive.
                </TooltipInfoIcon>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. my-mcp-server"
                  {...field}
                  className="font-mono"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {typeValue === 'docker_image' && (
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Docker image
                <TooltipInfoIcon>
                  The Docker image to run for this MCP server.
                </TooltipInfoIcon>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. mcp/server:latest"
                  {...field}
                  className="font-mono"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {typeValue === 'package_manager' && (
        <>
          <FormField
            control={form.control}
            name="protocol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Package manager
                  <TooltipInfoIcon>
                    The package manager to use for running this MCP server.
                  </TooltipInfoIcon>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a package manager" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="npx">npx</SelectItem>
                    <SelectItem value="uvx">uvx</SelectItem>
                    <SelectItem value="go">go</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="package_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Package name
                  <TooltipInfoIcon>
                    The package name to run with {protocolValue}.
                  </TooltipInfoIcon>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      protocolValue === 'npx'
                        ? 'e.g. @modelcontextprotocol/server-filesystem'
                        : protocolValue === 'uvx'
                          ? 'e.g. mcp-server-git'
                          : 'e.g. github.com/mark3labs/mcp-filesystem'
                    }
                    {...field}
                    className="font-mono"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      <FormField
        control={form.control}
        name="transport"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Transport
              <TooltipInfoIcon>
                The transport protocol to use for communication with the MCP
                server.
              </TooltipInfoIcon>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a transport" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="stdio">stdio</SelectItem>
                <SelectItem value="sse">sse</SelectItem>
                <SelectItem value="streamable-http">streamable-http</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {transportValue === 'sse' && (
        <FormField
          control={form.control}
          name="target_port"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Target port
                <TooltipInfoIcon>
                  The port number where the MCP server will be accessible.
                </TooltipInfoIcon>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 3000"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value
                    field.onChange(value === '' ? undefined : Number(value))
                  }}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <CommandArgumentsField<FormSchemaLocalMcp> form={form} />
    </>
  )
}
