import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Form,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useForm } from 'react-hook-form'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/common/components/ui/select'
import { Button } from '@/common/components/ui/button'
import { FormFieldsAuth } from './form-fields-auth'
import {
  getFormSchemaRemoteMcp,
  type FormSchemaRemoteMcp,
} from '../../lib/form-schema-remote-mcp'
import { FormFieldsArrayCustomSecrets } from '../form-fields-array-custom-secrets'
import { FormFieldsArrayCustomEnvVars } from '../form-fields-array-custom-env-vars'

const DEFAULT_FORM_VALUES = {
  name: '',
  url: '',
  oauth_config: {
    authorize_url: '',
    callback_port: undefined,
    client_id: '',
    client_secret: '',
    issuer: '',
    oauth_params: {},
    scopes: [],
    skip_browser: false,
    token_url: '',
    use_pkce: true,
  },
  envVars: [],
  secrets: [],
}

export function DialogFormRemoteMcp({
  closeDialog,
  isOpen,
}: {
  closeDialog: () => void
  serverToEdit?: string | null
  isOpen: boolean
}) {
  const form = useForm<FormSchemaRemoteMcp>({
    resolver: zodV4Resolver(getFormSchemaRemoteMcp([])),
    defaultValues: DEFAULT_FORM_VALUES,
    reValidateMode: 'onChange',
    mode: 'onChange',
  })

  const onSubmitForm = (data: FormSchemaRemoteMcp) => {
    console.log(data)
  }

  const authType = form.watch('auth_type')

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent
        className="p-0 sm:max-w-2xl"
        onCloseAutoFocus={() => {
          closeDialog()
        }}
        onInteractOutside={(e) => {
          // Prevent closing the dialog when clicking outside
          e.preventDefault()
        }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitForm)}>
            <DialogHeader className="mb-4 p-6">
              <DialogTitle>Add a remote MCP server</DialogTitle>
              <DialogDescription>TODO: add description</DialogDescription>
            </DialogHeader>

            <div
              className="relative max-h-[65dvh] space-y-4 overflow-y-auto px-6"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1">
                      <FormLabel>Server name</FormLabel>
                      <TooltipInfoIcon>
                        The human-readable name you will use to identify this
                        server.
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
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1">
                      <FormLabel>Server URL</FormLabel>
                      <TooltipInfoIcon>
                        The URL of the MCP server.
                      </TooltipInfoIcon>
                    </div>
                    <FormControl>
                      <Input
                        autoCorrect="off"
                        autoComplete="off"
                        autoFocus
                        data-1p-ignore
                        placeholder="e.g. https://example.com/mcp"
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
                name="auth_type"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1">
                      <FormLabel htmlFor={field.name}>
                        Authorization method
                      </FormLabel>
                      <TooltipInfoIcon>
                        The authorization method the MCP server uses to
                        authenticate clients.
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
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="oauth2">OAuth2</SelectItem>
                          <SelectItem value="oidc">OIDC</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormFieldsAuth authType={authType} form={form} />
              {(authType === undefined || authType === 'none') && (
                <>
                  <FormFieldsArrayCustomSecrets form={form} />
                  <FormFieldsArrayCustomEnvVars form={form} />
                </>
              )}
            </div>

            <DialogFooter className="p-6">
              <Button
                type="button"
                variant="outline"
                // disabled={isSubmitting}
                onClick={() => {
                  closeDialog()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Install server</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
