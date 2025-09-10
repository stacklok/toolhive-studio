import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/common/components/ui/select'
import { type FormSchemaRemoteMcp } from '../../lib/form-schema-remote-mcp'
import { type UseFormReturn } from 'react-hook-form'

export function FormFieldsAuth({
  authType,
  form,
}: {
  authType: string | undefined
  form: UseFormReturn<FormSchemaRemoteMcp>
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="oauth_config.callback_port"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1">
              <FormLabel htmlFor={field.name}>Callback port</FormLabel>
              <TooltipInfoIcon className="max-w-72">
                Callback port to expose from the container. If not specified,
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
                value={field.value || ''}
                onChange={(e) => {
                  const value = e.target.value
                  field.onChange(value === '' ? '' : parseInt(value, 10))
                }}
                name={field.name}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {authType === 'oidc' && (
        <>
          <FormField
            control={form.control}
            name="oauth_config.issuer"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel>Issuer URL</FormLabel>
                  <TooltipInfoIcon>The URL of the OIDC issuer.</TooltipInfoIcon>
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

          <FormField
            control={form.control}
            name="oauth_config.client_id"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel>Client ID</FormLabel>
                  <TooltipInfoIcon>
                    The client ID of the OIDC issuer.
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

          <FormField
            control={form.control}
            name="oauth_config.client_secret"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel>Client Secret</FormLabel>
                  <TooltipInfoIcon>
                    The client secret of the OIDC issuer.
                  </TooltipInfoIcon>
                </div>
                <FormControl>
                  <Input
                    autoCorrect="off"
                    autoComplete="off"
                    autoFocus
                    data-1p-ignore
                    placeholder="e.g. secret"
                    value={field.value}
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
            name="oauth_config.use_pkce"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel htmlFor={field.name}>PKCE</FormLabel>
                  <TooltipInfoIcon>
                    Whether to use PKCE for the OAuth flow.
                  </TooltipInfoIcon>
                </div>
                <FormControl>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'true')}
                    value={field.value ? 'true' : 'false'}
                    name={field.name}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="Select PKCE" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      {authType === 'oauth2' && (
        <>
          <FormField
            control={form.control}
            name="oauth_config.authorize_url"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel>Authorize URL</FormLabel>
                  <TooltipInfoIcon>
                    The URL of the OAuth authorize endpoint.
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

          <FormField
            control={form.control}
            name="oauth_config.token_url"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel>Token URL</FormLabel>
                  <TooltipInfoIcon>
                    The URL of the OAuth token endpoint.
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

          <FormField
            control={form.control}
            name="oauth_config.client_id"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel>Client ID</FormLabel>
                  <TooltipInfoIcon>
                    The client ID of the OAuth provider
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

          <FormField
            control={form.control}
            name="oauth_config.client_secret"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel>Client Secret</FormLabel>
                  <TooltipInfoIcon>
                    The client secret of the OAuth issuer.
                  </TooltipInfoIcon>
                </div>
                <FormControl>
                  <Input
                    autoCorrect="off"
                    autoComplete="off"
                    autoFocus
                    data-1p-ignore
                    placeholder="e.g. secret"
                    value={field.value}
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
            name="oauth_config.scopes"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel>Scopes</FormLabel>
                  <TooltipInfoIcon>
                    The scopes of the OAuth flow.
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
        </>
      )}
    </>
  )
}
