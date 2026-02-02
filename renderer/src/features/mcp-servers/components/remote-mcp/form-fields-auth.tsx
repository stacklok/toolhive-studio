import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'
import { type UseFormReturn, useWatch } from 'react-hook-form'
import { SecretStoreCombobox } from '@/common/components/secrets/secret-store-combobox'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { cn } from '@/common/lib/utils'
import { Checkbox } from '@/common/components/ui/checkbox'
import { useDebouncedCallback } from '@/common/hooks/use-debounced-callback'
import {
  REMOTE_MCP_AUTH_TYPES,
  type RemoteMcpAuthType,
} from '@/common/lib/form-schema-mcp'
import type { SecretFieldValue } from '@/common/types/secrets'

const AUTH_FIELD_MATRIX = {
  auto_discovered: ['callback_port'],
  bearer_token: ['bearer_token'],
  oidc: [
    'callback_port',
    'issuer',
    'client_id',
    'client_secret',
    'use_pkce',
    'scopes',
  ],
  oauth2: [
    'callback_port',
    'authorize_url',
    'token_url',
    'client_id',
    'client_secret',
    'scopes',
    'use_pkce',
  ],
} as const

type AuthFieldName =
  (typeof AUTH_FIELD_MATRIX)[keyof typeof AUTH_FIELD_MATRIX][number]

const shouldShowField =
  (authType: RemoteMcpAuthType | undefined) => (fieldName: AuthFieldName) => {
    if (!authType) return false
    const fields = AUTH_FIELD_MATRIX[authType as keyof typeof AUTH_FIELD_MATRIX]
    return (fields as readonly AuthFieldName[])?.includes(fieldName) ?? false
  }

const DEBOUNCE_DELAY_MS = 500

type SecretValueData = { secret: string; isFromStore: boolean }

type SecretValue = {
  name: string
  value: SecretValueData
}

const getDefaultSecretName = (
  mcpName: string | undefined,
  prefix: string
): string => {
  const sanitizedMcpName = mcpName?.replaceAll('-', '_').toUpperCase()
  return sanitizedMcpName ? `${prefix}_${sanitizedMcpName}` : `${prefix}`
}

const buildSecretValue = ({
  fieldValue,
  mcpName,
  prefix,
}: {
  fieldValue: SecretFieldValue | undefined
  mcpName: string | undefined
  prefix: string
}): SecretValue => {
  if (!fieldValue) {
    return {
      name: getDefaultSecretName(mcpName, prefix),
      value: { secret: '', isFromStore: false },
    }
  }

  if (fieldValue.value.isFromStore) {
    return fieldValue
  }

  return {
    name: getDefaultSecretName(mcpName, prefix),
    value: { secret: fieldValue.value.secret ?? '', isFromStore: false },
  }
}

export function FormFieldsAuth({
  authType,
  form,
}: {
  authType: RemoteMcpAuthType | undefined
  form: UseFormReturn<FormSchemaRemoteMcp>
}) {
  const showField = shouldShowField(authType)
  const mcpName = useWatch({ control: form.control, name: 'name' })
  const debouncedTrigger = useDebouncedCallback(
    () => form.trigger(),
    DEBOUNCE_DELAY_MS
  )

  return (
    <>
      {showField(REMOTE_MCP_AUTH_TYPES.BearerToken) && (
        <FormField
          control={form.control}
          name="oauth_config.bearer_token"
          render={({ field }) => {
            const currentValue = buildSecretValue({
              fieldValue: field.value,
              mcpName,
              prefix: 'BEARER_TOKEN',
            })

            return (
              <FormItem className="pb-8">
                <div className="flex items-center gap-1">
                  <FormLabel>Bearer Token</FormLabel>
                  <TooltipInfoIcon>
                    The bearer token for the authentication.
                  </TooltipInfoIcon>
                </div>
                <p className="text-muted-foreground text-sm">
                  The bearer token is stored securely by ToolHive.
                </p>
                <FormControl>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FormLabel
                        htmlFor="oauth_config.bearer_token.name"
                        className="text-muted-foreground flex items-center gap-1
                          pb-2 font-mono text-sm"
                      >
                        Bearer token name
                        <TooltipInfoIcon className="m-w-90">
                          The key name under which this bearer token will be
                          stored and accessible.
                        </TooltipInfoIcon>
                      </FormLabel>
                      <Input
                        id="oauth_config.bearer_token.name"
                        autoCorrect="off"
                        autoComplete="off"
                        data-1p-ignore
                        disabled
                        className="font-mono"
                        placeholder="e.g. BEARER_TOKEN"
                        value={currentValue.name}
                      />
                    </div>
                    <div>
                      <FormLabel
                        htmlFor="oauth_config.bearer_token.value"
                        className="text-muted-foreground flex items-center gap-1
                          pb-2 font-mono text-sm"
                      >
                        Value
                        <TooltipInfoIcon className="m-w-90">
                          The bearer token value that proves your application's
                          identity.
                        </TooltipInfoIcon>
                      </FormLabel>
                      <div
                        className="grid grid-cols-[auto_calc(var(--spacing)*9)]"
                      >
                        <Input
                          id="oauth_config.bearer_token.value"
                          autoCorrect="off"
                          autoComplete="off"
                          type="password"
                          data-1p-ignore
                          className="rounded-tr-none rounded-br-none border-r-0
                            font-mono focus-visible:z-10"
                          placeholder="e.g. token_123_ABC_789_XYZ"
                          value={currentValue.value.secret}
                          onChange={(e) =>
                            field.onChange({
                              ...currentValue,
                              name: getDefaultSecretName(
                                mcpName,
                                'BEARER_TOKEN'
                              ),
                              value: {
                                secret: e.target.value,
                                isFromStore: false,
                              },
                            })
                          }
                        />
                        <SecretStoreCombobox
                          value={currentValue.value.secret}
                          onChange={(secretKey) =>
                            field.onChange({
                              ...currentValue,
                              name: secretKey,
                              value: {
                                secret: secretKey,
                                isFromStore: true,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      )}

      {showField('callback_port') && (
        <FormField
          control={form.control}
          name="oauth_config.callback_port"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel htmlFor={field.name}>Callback port</FormLabel>
                <TooltipInfoIcon className="max-w-72">
                  Callback port for the authentication redirect.
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
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    field.onChange(value === '' ? '' : parseInt(value, 10))
                    debouncedTrigger()
                  }}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {showField('issuer') && (
        <FormField
          control={form.control}
          name="oauth_config.issuer"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel>Issuer URL</FormLabel>
                <TooltipInfoIcon>
                  The base issuer URL of the OIDC provider.
                </TooltipInfoIcon>
              </div>
              <FormControl>
                <Input
                  autoCorrect="off"
                  autoComplete="off"
                  autoFocus
                  data-1p-ignore
                  placeholder="e.g. https://auth.example.com/"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    debouncedTrigger()
                  }}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {showField('authorize_url') && (
        <FormField
          control={form.control}
          name="oauth_config.authorize_url"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel>Authorize URL</FormLabel>
                <TooltipInfoIcon>
                  The authorize URL where users are redirected to authenticate
                  and authorize your MCP server.
                </TooltipInfoIcon>
              </div>
              <FormControl>
                <Input
                  autoCorrect="off"
                  autoComplete="off"
                  autoFocus
                  data-1p-ignore
                  placeholder="e.g. https://auth.example.com/oauth/authorize"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    debouncedTrigger()
                  }}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {showField('token_url') && (
        <FormField
          control={form.control}
          name="oauth_config.token_url"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel>Token URL</FormLabel>
                <TooltipInfoIcon>
                  The token URL where your application exchanges the
                  authorization code for access tokens.
                </TooltipInfoIcon>
              </div>
              <FormControl>
                <Input
                  autoCorrect="off"
                  autoComplete="off"
                  autoFocus
                  data-1p-ignore
                  placeholder="e.g. https://auth.example.com/oauth/token"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    debouncedTrigger()
                  }}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {showField('client_id') && (
        <FormField
          control={form.control}
          name="oauth_config.client_id"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel>Client ID</FormLabel>
                <TooltipInfoIcon>
                  The client ID for your application registered with the OIDC
                  provider.
                </TooltipInfoIcon>
              </div>
              <FormControl>
                <Input
                  autoCorrect="off"
                  autoComplete="off"
                  autoFocus
                  data-1p-ignore
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    debouncedTrigger()
                  }}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {showField('client_secret') && (
        <FormField
          control={form.control}
          name="oauth_config.client_secret"
          render={({ field }) => {
            const currentValue = buildSecretValue({
              fieldValue: field.value,
              mcpName,
              prefix: 'OAUTH_CLIENT_SECRET',
            })

            return (
              <FormItem className="pb-8">
                <div className="flex items-center gap-1">
                  <FormLabel>Client Secret</FormLabel>
                  <TooltipInfoIcon>
                    The client secret key that proves your application's
                    identity.
                  </TooltipInfoIcon>
                </div>
                <p className="text-muted-foreground text-sm">
                  All secrets are encrypted and securely stored by ToolHive.
                </p>
                <FormControl>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FormLabel
                        htmlFor="oauth_config.client_secret.name"
                        className={cn(
                          `text-muted-foreground border-input! h-full
                          items-center font-mono ring-0!`
                        )}
                      >
                        Client secret name
                        <TooltipInfoIcon className="m-w-90">
                          The key name under which this secret will be stored
                          and accessible.
                        </TooltipInfoIcon>
                      </FormLabel>
                      <Input
                        id="oauth_config.client_secret.name"
                        autoCorrect="off"
                        autoComplete="off"
                        data-1p-ignore
                        disabled
                        className="font-mono"
                        placeholder="e.g. CLIENT_SECRET"
                        value={currentValue.name}
                      />
                    </div>
                    <div>
                      <FormLabel
                        htmlFor="oauth_config.client_secret.value"
                        className={cn(
                          `text-muted-foreground border-input! h-full
                          items-center font-mono ring-0!`
                        )}
                      >
                        Value
                        <TooltipInfoIcon className="m-w-90">
                          The client secret value that proves your application's
                          identity.
                        </TooltipInfoIcon>
                      </FormLabel>
                      <div
                        className="grid grid-cols-[auto_calc(var(--spacing)*9)]"
                      >
                        <Input
                          id="oauth_config.client_secret.value"
                          autoCorrect="off"
                          autoComplete="off"
                          type="password"
                          data-1p-ignore
                          className="rounded-tr-none rounded-br-none border-r-0
                            font-mono focus-visible:z-10"
                          placeholder="e.g. secret_123_ABC_789_XYZ"
                          value={currentValue.value.secret}
                          onChange={(e) =>
                            field.onChange({
                              ...currentValue,
                              name: getDefaultSecretName(
                                mcpName,
                                'OAUTH_CLIENT_SECRET'
                              ),
                              value: {
                                secret: e.target.value,
                                isFromStore: false,
                              },
                            })
                          }
                        />
                        <SecretStoreCombobox
                          value={currentValue.value.secret}
                          onChange={(secretKey) =>
                            field.onChange({
                              ...currentValue,
                              name: secretKey,
                              value: {
                                secret: secretKey,
                                isFromStore: true,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      )}

      {showField('scopes') && (
        <FormField
          control={form.control}
          name="oauth_config.scopes"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel>Scopes</FormLabel>
                <TooltipInfoIcon>
                  The list of scopes (permissions) your app is requesting.
                  Separate with commas.
                </TooltipInfoIcon>
              </div>
              <FormControl>
                <Input
                  autoCorrect="off"
                  autoComplete="off"
                  autoFocus
                  data-1p-ignore
                  placeholder="e.g. users, administrators"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {showField('use_pkce') && (
        <FormField
          control={form.control}
          name="oauth_config.use_pkce"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel htmlFor={field.name}>PKCE</FormLabel>
                <TooltipInfoIcon>
                  Proof Key for Code Exchange (RFC 7636), automatically enables
                  PKCE flow without client_secret.
                </TooltipInfoIcon>
              </div>
              <FormControl>
                <Checkbox
                  id={field.name}
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  )
}
