import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import { Input } from "@/common/components/ui/input";
import { type FormSchemaRunMcpCommand } from "../lib/form-schema-run-mcp-server-with-command";
import { type UseFormReturn } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { TooltipInfoIcon } from "@/common/components/ui/tooltip-info-icon";

export function FormFieldsRunMcpCommand({
  form,
}: {
  form: UseFormReturn<FormSchemaRunMcpCommand>;
}) {
  const commandValue = form.watch("command");

  return (
    <>
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
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="command"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1">
              <FormLabel htmlFor={field.name}>Command</FormLabel>
              <TooltipInfoIcon>
                The command to run the MCP server.
              </TooltipInfoIcon>
            </div>
            <FormControl>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                name={field.name}
              >
                <SelectTrigger id={field.name} className="w-full">
                  <SelectValue placeholder="e.g. docker run, npx, uvx" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="docker_run">docker run</SelectItem>
                  <SelectItem value="npx">npx</SelectItem>
                  <SelectItem value="uvx">uvx</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {commandValue === "docker_run" ? (
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
                  placeholder="e.g. ghcr.io/acme-corp/my-awesome-server"
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

      {commandValue === "npx" || commandValue === "uvx" ? (
        <FormField
          control={form.control}
          name="cmd_arguments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Command arguments</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. -y my-awesome-mcp-server"
                  defaultValue={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>
                Space separated arguments for the command.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </>
  );
}
