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
import {
  getFormSchemaRemoteMcp,
  type FormSchemaRemoteMcp,
} from '../../lib/form-schema-remote-mcp'
import { FormFieldsArrayCustomSecrets } from '../form-fields-array-custom-secrets'
import { FormFieldsArrayCustomEnvVars } from '../form-fields-array-custom-env-vars'
import { FormFieldsAuth } from './form-fields-auth'
import { useRunRemoteServer } from '../../hooks/use-run-remote-server'
import log from 'electron-log/renderer'
import { useState } from 'react'
import { useUpdateServer } from '../../hooks/use-update-remote-server'
import {
  getApiV1BetaSecretsDefaultKeysOptions,
  getApiV1BetaWorkloadsByNameOptions,
  getApiV1BetaWorkloadsOptions,
} from '@api/@tanstack/react-query.gen'
import { useQuery } from '@tanstack/react-query'
import { convertCreateRequestToFormData } from '../../lib/orchestrate-run-remote-server'
import { LoadingStateAlert } from '@/common/components/secrets/loading-state-alert'
import { AlertErrorFormSubmission } from '@/common/components/workloads/alert-error-form-submission'

const DEFAULT_FORM_VALUES: FormSchemaRemoteMcp = {
  name: '',
  transport: 'streamable-http',
  auth_type: 'none',
  oauth_config: {
    authorize_url: '',
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
  url: '',
}

export function DialogFormRemoteMcp({
  closeDialog,
  isOpen,
  serverToEdit,
}: {
  closeDialog: () => void
  serverToEdit?: string | null
  isOpen: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingSecrets, setLoadingSecrets] = useState<{
    text: string
    completedCount: number
    secretsCount: number
  } | null>(null)

  const handleSecrets = (completedCount: number, secretsCount: number) => {
    setLoadingSecrets((prev) => ({
      ...prev,
      text: `Encrypting secrets (${completedCount} of ${secretsCount})...`,
      completedCount,
      secretsCount,
    }))
  }

  const {
    installServerMutation,
    checkServerStatus,
    isErrorSecrets,
    isPendingSecrets,
  } = useRunRemoteServer({
    onSecretSuccess: handleSecrets,
    onSecretError: (error, variables) => {
      log.error('onSecretError', error, variables)
    },
  })

  const { updateServerMutation, checkServerStatus: checkUpdateServerStatus } =
    useUpdateServer(serverToEdit || '', {
      onSecretSuccess: handleSecrets,
      onSecretError: (error, variables) => {
        log.error('onSecretError during update', error, variables)
      },
    })

  const { data } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
    retry: false,
  })

  const { data: availableSecrets } = useQuery({
    ...getApiV1BetaSecretsDefaultKeysOptions(),
    enabled: !!serverToEdit,
    retry: false,
  })

  const { data: existingServerData, isLoading: isLoadingServer } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: serverToEdit || '' },
    }),
    enabled: !!serverToEdit,
    retry: false,
  })

  const workloads = data?.workloads ?? []
  const existingServer = existingServerData
  const isEditing = !!existingServer && !!serverToEdit
  const editingFormData =
    isEditing &&
    convertCreateRequestToFormData(existingServer, availableSecrets)

  const form = useForm<FormSchemaRemoteMcp>({
    resolver: zodV4Resolver(
      getFormSchemaRemoteMcp(workloads, serverToEdit || undefined)
    ),
    defaultValues: DEFAULT_FORM_VALUES,
    reValidateMode: 'onChange',
    mode: 'onChange',
    ...(editingFormData ? { values: editingFormData } : {}),
  })

  const onSubmitForm = (data: FormSchemaRemoteMcp) => {
    setIsSubmitting(true)
    if (error) {
      setError(null)
    }
    if (isEditing) {
      updateServerMutation(
        { data },
        {
          onSuccess: () => {
            checkUpdateServerStatus()
            closeDialog()
          },
          onSettled: (_, error) => {
            setIsSubmitting(false)
            setLoadingSecrets(null)
            if (!error) {
              form.reset()
            }
          },
          onError: (error) => {
            setError(typeof error === 'string' ? error : error.message)
          },
        }
      )
    } else {
      installServerMutation(
        { data },
        {
          onSuccess: () => {
            checkServerStatus(data)
            closeDialog()
          },
          onSettled: (_, error) => {
            setIsSubmitting(false)
            if (!error) {
              form.reset()
            }
          },
          onError: (error) => {
            setError(typeof error === 'string' ? error : error.message)
          },
        }
      )
    }
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
              <DialogDescription className="sr-only">
                Set up the environment variables and name for this MCP server
                installation.
              </DialogDescription>
            </DialogHeader>
            {(isSubmitting || (isEditing && isLoadingServer)) && (
              <LoadingStateAlert
                isPendingSecrets={isPendingSecrets}
                loadingSecrets={
                  isLoadingServer
                    ? {
                        text: `Loading server "${serverToEdit}"...`,
                        completedCount: 0,
                        secretsCount: 0,
                      }
                    : loadingSecrets
                }
              />
            )}
            {!isSubmitting && !(isEditing && isLoadingServer) && (
              <div
                className="relative max-h-[65dvh] space-y-4 overflow-y-auto
                  px-6"
              >
                {error && (
                  <AlertErrorFormSubmission
                    error={error}
                    isErrorSecrets={isErrorSecrets}
                    onDismiss={() => setError(null)}
                  />
                )}
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
                  name="transport"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1">
                        <FormLabel htmlFor={field.name}>Transport</FormLabel>
                        <TooltipInfoIcon>
                          The transport mechanism the MCP server uses to
                          communicate with clients.
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
            )}

            <DialogFooter className="p-6">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || (isEditing && isLoadingServer)}
                onClick={() => {
                  closeDialog()
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={isSubmitting || (isEditing && isLoadingServer)}
                type="submit"
              >
                {isEditing ? 'Update server' : 'Install server'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
