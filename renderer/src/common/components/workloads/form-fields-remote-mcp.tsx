import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/common/components/ui/select'
import { ExternalLinkIcon, Plus, Trash2 } from 'lucide-react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../ui/form'
import { TooltipInfoIcon } from '../ui/tooltip-info-icon'
import { useFieldArray, type Control } from 'react-hook-form'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import type { GroupsGroup } from '@common/api/generated/types.gen'
import { Input } from '../ui/input'
import { REMOTE_MCP_AUTH_TYPES } from '@/common/lib/form-schema-mcp'
import { FormFieldsProxy } from './form-fields-proxy'
import { Button } from '../ui/button'
import { SecretStoreCombobox } from '../secrets/secret-store-combobox'

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
                <SelectItem value={REMOTE_MCP_AUTH_TYPES.AutoDiscovered}>
                  Auto-Discovered
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

const getDefaultSecretNameFromHeader = (headerName: string): string => {
  if (!headerName) return 'HEADER_SECRET'
  return headerName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function FormFieldsCustomHeaders({
  control,
}: {
  control: Control<FormSchemaRemoteMcp>
}) {
  const {
    fields: plaintextFields,
    append: appendPlaintext,
    remove: removePlaintext,
  } = useFieldArray({
    control,
    name: 'header_forward.add_plaintext_headers',
  })

  const {
    fields: secretFields,
    append: appendSecret,
    remove: removeSecret,
  } = useFieldArray({
    control,
    name: 'header_forward.add_headers_from_secret',
  })

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-1">
          <FormLabel>Custom Headers</FormLabel>
          <TooltipInfoIcon className="max-w-80">
            Add custom HTTP headers to inject into requests to the remote MCP
            server. Use this to add headers like X-Tenant-ID or correlation IDs.
          </TooltipInfoIcon>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <FormLabel className="text-muted-foreground text-sm font-normal">
                Plaintext Headers
              </FormLabel>
              <TooltipInfoIcon className="max-w-72">
                These values are stored and transmitted in plaintext. Use
                &quot;Headers from Secrets&quot; for sensitive data like API
                keys.
              </TooltipInfoIcon>
            </div>

            {plaintextFields.length > 0 && (
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <span className="text-muted-foreground text-xs">
                  Header name
                </span>
                <span className="text-muted-foreground text-xs">Value</span>
                <span className="w-9" />
              </div>
            )}

            {plaintextFields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-2"
              >
                <FormField
                  control={control}
                  name={`header_forward.add_plaintext_headers.${index}.header_name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="X-Tenant-ID"
                          className="font-mono"
                          autoComplete="off"
                          data-1p-ignore
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`header_forward.add_plaintext_headers.${index}.header_value`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="tenant-123"
                          className="font-mono"
                          autoComplete="off"
                          data-1p-ignore
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removePlaintext(index)}
                  aria-label={`Remove plaintext header ${index + 1}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                appendPlaintext({ header_name: '', header_value: '' })
              }
            >
              <Plus className="size-4" />
              Add plaintext header
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <FormLabel className="text-muted-foreground text-sm font-normal">
                Headers from Secrets
              </FormLabel>
              <TooltipInfoIcon className="max-w-72">
                Header values are retrieved from ToolHive&apos;s secrets
                manager. Use this for sensitive data like API keys.
              </TooltipInfoIcon>
            </div>

            {secretFields.length > 0 && (
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <span className="text-muted-foreground text-xs">
                  Header name
                </span>
                <span className="text-muted-foreground text-xs">
                  Secret value
                </span>
                <span className="w-9" />
              </div>
            )}

            {secretFields.map((field, index) => (
              <FormField
                key={field.id}
                control={control}
                name={`header_forward.add_headers_from_secret.${index}`}
                render={({ field: secretField }) => {
                  const currentValue = secretField.value as {
                    header_name: string
                    secret: {
                      name: string
                      value: { secret: string; isFromStore: boolean }
                    }
                  }

                  return (
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <FormItem>
                        <FormControl>
                          <Input
                            value={currentValue.header_name}
                            onChange={(e) =>
                              secretField.onChange({
                                ...currentValue,
                                header_name: e.target.value,
                                secret: {
                                  ...currentValue.secret,
                                  name: currentValue.secret.value.isFromStore
                                    ? currentValue.secret.name
                                    : getDefaultSecretNameFromHeader(
                                        e.target.value
                                      ),
                                },
                              })
                            }
                            placeholder="Authorization"
                            className="font-mono"
                            autoComplete="off"
                            data-1p-ignore
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                      <FormItem>
                        <FormControl>
                          <div className="grid grid-cols-[1fr_auto]">
                            <Input
                              value={currentValue.secret.value.secret}
                              onChange={(e) =>
                                secretField.onChange({
                                  ...currentValue,
                                  secret: {
                                    name: getDefaultSecretNameFromHeader(
                                      currentValue.header_name
                                    ),
                                    value: {
                                      secret: e.target.value,
                                      isFromStore: false,
                                    },
                                  },
                                })
                              }
                              placeholder="secret_value_123"
                              type="password"
                              className="rounded-tr-none rounded-br-none
                                border-r-0 font-mono focus-visible:z-10"
                              autoComplete="off"
                              data-1p-ignore
                            />
                            <SecretStoreCombobox
                              value={currentValue.secret.value.secret}
                              onChange={(secretKey) =>
                                secretField.onChange({
                                  ...currentValue,
                                  secret: {
                                    name: secretKey,
                                    value: {
                                      secret: secretKey,
                                      isFromStore: true,
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeSecret(index)}
                        aria-label={`Remove secret header ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )
                }}
              />
            ))}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                appendSecret({
                  header_name: '',
                  secret: {
                    name: '',
                    value: { secret: '', isFromStore: false },
                  },
                })
              }
            >
              <Plus className="size-4" />
              Add header from secret
            </Button>
          </div>
        </div>
      </div>
    </div>
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
      <FormFieldsCustomHeaders control={control} />
      <FormFieldRemoteAuthType control={control} />
    </>
  )
}
