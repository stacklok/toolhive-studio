import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/common/components/ui/select'
import { ExternalLinkIcon } from 'lucide-react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../ui/form'
import { TooltipInfoIcon } from '../ui/tooltip-info-icon'
import type { Control } from 'react-hook-form'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import type { GroupsGroup } from '@common/api/generated/types.gen'
import { Input } from '../ui/input'
import { REMOTE_MCP_AUTH_TYPES } from '@/common/lib/form-schema-mcp'
import { FormFieldsProxy } from './form-fields-proxy'

function FormFieldRemoteAuthType({
  control,
}: {
  control: Control<FormSchemaRemoteMcp>
}) {
  return (
    <FormField
      control={control}
      name="auth_type"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-1">
            <FormLabel htmlFor={field.name}>Authorization method</FormLabel>
            <TooltipInfoIcon className="flex flex-wrap items-center gap-1">
              The authorization method the MCP server uses to authenticate
              clients. Refer to the{' '}
              <a
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center gap-1 underline"
                href="https://docs.stacklok.com/toolhive/guides-ui/run-mcp-servers?custom-type=custom_remote#install-a-custom-mcp-server"
                target="_blank"
              >
                documentation <ExternalLinkIcon size={12} />
              </a>
            </TooltipInfoIcon>
          </div>
          <FormControl>
            <Select
              onValueChange={field.onChange}
              value={field.value || ''}
              name={field.name}
            >
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue placeholder="Select authorization method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={REMOTE_MCP_AUTH_TYPES.None}>
                  Dynamic Client Registration
                </SelectItem>
                <SelectItem value={REMOTE_MCP_AUTH_TYPES.OAuth2}>
                  OAuth 2.0
                </SelectItem>
                <SelectItem value={REMOTE_MCP_AUTH_TYPES.OIDC}>OIDC</SelectItem>
                <SelectItem value={REMOTE_MCP_AUTH_TYPES.BearerToken}>
                  Bearer Token
                </SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function FormFieldRemoteGroup({
  control,
  groups,
}: {
  control: Control<FormSchemaRemoteMcp>
  groups: GroupsGroup[]
}) {
  return (
    <FormField
      control={control}
      name="group"
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
                {groups
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
  )
}

function FormFieldRemoteUrl({
  control,
}: {
  control: Control<FormSchemaRemoteMcp>
}) {
  return (
    <FormField
      control={control}
      name="url"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-1">
            <FormLabel>Server URL</FormLabel>
            <TooltipInfoIcon>The URL of the MCP server.</TooltipInfoIcon>
          </div>
          <FormControl>
            <Input
              autoCorrect="off"
              autoComplete="off"
              autoFocus
              data-1p-ignore
              placeholder="e.g. https://example.com/mcp"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              name={field.name}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function FormFieldRemoteTransport({
  control,
}: {
  control: Control<FormSchemaRemoteMcp>
}) {
  return (
    <FormField
      control={control}
      name="transport"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-1">
            <FormLabel htmlFor={field.name}>Transport</FormLabel>
            <TooltipInfoIcon>
              The transport protocol the MCP server uses to communicate with
              clients.
            </TooltipInfoIcon>
          </div>
          <FormControl>
            <Select
              onValueChange={(value) => field.onChange(value)}
              value={field.value}
              name={field.name}
            >
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue placeholder="e.g. SSE, Streamable HTTP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sse">SSE</SelectItem>
                <SelectItem value="streamable-http">Streamable HTTP</SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function FormFieldRemoteServerName({
  control,
  isEditing,
}: {
  control: Control<FormSchemaRemoteMcp>
  isEditing: boolean
}) {
  return (
    <FormField
      control={control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-1">
            <FormLabel>Server name</FormLabel>
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
  )
}

export function FormFieldsRemoteMcp({
  control,
  groups,
  isEditing,
}: {
  control: Control<FormSchemaRemoteMcp>
  groups: GroupsGroup[]
  isEditing: boolean
}) {
  return (
    <>
      <FormFieldRemoteServerName control={control} isEditing={isEditing} />
      <FormFieldRemoteGroup control={control} groups={groups} />
      <FormFieldRemoteUrl control={control} />
      <FormFieldRemoteTransport control={control} />
      <FormFieldsProxy<FormSchemaRemoteMcp> control={control} />
      <FormFieldRemoteAuthType control={control} />
    </>
  )
}
