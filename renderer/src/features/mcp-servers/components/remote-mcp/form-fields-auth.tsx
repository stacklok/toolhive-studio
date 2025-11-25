import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'
import { type UseFormReturn } from 'react-hook-form'
import { SecretStoreCombobox } from '@/common/components/secrets/secret-store-combobox'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { cn } from '@/common/lib/utils'
import { Checkbox } from '@/common/components/ui/checkbox'

const AUTH_FIELD_MATRIX = {
  none: ['callback_port', 'issuer'],
  oidc: ['callback_port', 'issuer', 'client_id', 'client_secret', 'use_pkce'],
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

const shouldShowField = (
  authType: string | undefined,
  fieldName: AuthFieldName
) => {
  if (!authType) return false
  const fields = AUTH_FIELD_MATRIX[authType as keyof typeof AUTH_FIELD_MATRIX]
  return (fields as readonly AuthFieldName[])?.includes(fieldName) ?? false
}

export function FormFieldsAuth({
  authType,
  form,
}: {
  authType: string | undefined
  form: UseFormReturn<FormSchemaRemoteMcp>
}) {
  return (
    <>
      {shouldShowField(authType, 'callback_port') && (
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
                  onChange={async (e) => {
                    const value = e.target.value
                    field.onChange(value === '' ? '' : parseInt(value, 10))
                    await form.trigger()
                  }}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {shouldShowField(authType, 'issuer') && (
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
                  onChange={(e) => field.onChange(e.target.value)}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {shouldShowField(authType, 'authorize_url') && (
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
                  onChange={(e) => field.onChange(e.target.value)}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {shouldShowField(authType, 'token_url') && (
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
                  onChange={(e) => field.onChange(e.target.value)}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {shouldShowField(authType, 'client_id') && (
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
                  onChange={(e) => field.onChange(e.target.value)}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {shouldShowField(authType, 'client_secret') && (
        <FormField
          control={form.control}
          name="oauth_config.client_secret"
          render={({ field }) => {
            type SecretValue = {
              name: string
              value: { secret: string; isFromStore: boolean }
            }

            const currentValue =
              field.value &&
              typeof field.value === 'object' &&
              field.value !== null &&
              'name' in field.value &&
              'value' in field.value
                ? (field.value as SecretValue)
                : ({
                    name: 'CLIENT_SECRET',
                    value: { secret: '', isFromStore: false },
                  } as SecretValue)

            return (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel>Client Secret</FormLabel>
                  <TooltipInfoIcon>
                    The client secret key that proves your application's
                    identity.
                  </TooltipInfoIcon>
                </div>
                <p className="text-muted-foreground mb-6 text-sm">
                  All secrets are encrypted and securely stored by ToolHive.
                </p>
                <FormControl>
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]
                      gap-2"
                  >
                    <div>
                      <FormLabel
                        htmlFor="oauth_config.client_secret.value"
                        className={cn(
                          `text-muted-foreground border-input! h-full
                          items-center font-mono ring-0!`
                        )}
                      >
                        CLIENT_SECRET
                        <TooltipInfoIcon className="m-w-90">
                          The client secret key that proves your application's
                          identity.
                        </TooltipInfoIcon>
                      </FormLabel>
                    </div>
                    <div
                      className="grid grid-cols-[auto_calc(var(--spacing)*9)]"
                    >
                      <Input
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
                            value: {
                              secret: secretKey,
                              isFromStore: true,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      )}

      {shouldShowField(authType, 'scopes') && (
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

      {shouldShowField(authType, 'use_pkce') && (
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
