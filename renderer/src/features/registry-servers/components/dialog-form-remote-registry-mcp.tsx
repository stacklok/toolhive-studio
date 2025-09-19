import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import type { RegistryRemoteServerMetadata } from '@api/types.gen'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { groupEnvVars } from '../lib/group-env-vars'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import { LoadingStateAlert } from '../../../common/components/secrets/loading-state-alert'
import { AlertErrorFormSubmission } from '@/common/components/workloads/alert-error-form-submission'
import { DialogWorkloadFormWrapper } from '@/common/components/workloads/dialog-workload-form-wrapper'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'
import {
  getFormSchemaRemoteMcp,
  type FormSchemaRemoteMcp,
} from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { convertCreateRequestToFormData } from '../lib/orchestrate-run-remote-registry-server'
import { useRunRemoteServer } from '@/features/mcp-servers/hooks/use-run-remote-server'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { TooltipInfoIcon } from '@/common/components/ui/tooltip-info-icon'
import { FormFieldsArrayCustomEnvVars } from '@/features/mcp-servers/components/form-fields-array-custom-env-vars'
import { FormFieldsArrayCustomSecrets } from '@/features/mcp-servers/components/form-fields-array-custom-secrets'
import { FormFieldsAuth } from '@/features/mcp-servers/components/remote-mcp/form-fields-auth'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/common/components/ui/select'
import { ExternalLinkIcon } from 'lucide-react'

const DEFAULT_FORM_VALUES: FormSchemaRemoteMcp = {
  name: '',
  transport: 'streamable-http',
  auth_type: 'none',
  oauth_config: {
    authorize_url: '',
    client_id: '',
    client_secret: undefined,
    issuer: '',
    oauth_params: {},
    scopes: '',
    skip_browser: false,
    token_url: '',
    use_pkce: true,
  },
  envVars: [],
  secrets: [],
  url: '',
}

interface FormRunFromRegistryProps {
  server: RegistryRemoteServerMetadata | null
  isOpen: boolean
  closeDialog: () => void
}

export function DialogFormRemoteRegistryMcp({
  server,
  isOpen,
  closeDialog,
}: FormRunFromRegistryProps) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingSecrets, setLoadingSecrets] = useState<{
    text: string
    completedCount: number
    secretsCount: number
  } | null>(null)
  const groupedEnvVars = useMemo(
    () => groupEnvVars(server?.env_vars || []),
    [server?.env_vars]
  )
  const { checkServerStatus } = useCheckServerStatus()
  const handleSecrets = (completedCount: number, secretsCount: number) => {
    setLoadingSecrets((prev) => ({
      ...prev,
      text: `Encrypting secrets (${completedCount} of ${secretsCount})...`,
      completedCount,
      secretsCount,
    }))
  }

  const { installServerMutation, isErrorSecrets, isPendingSecrets } =
    useRunRemoteServer({
      groupName: 'default',
      onSecretSuccess: handleSecrets,
      onSecretError: (error, variables) => {
        log.error('onSecretError', error, variables)
      },
    })

  const { data } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
    retry: false,
  })

  const workloads = data?.workloads ?? []

  const form = useForm<FormSchemaRemoteMcp>({
    resolver: zodV4Resolver(
      getFormSchemaRemoteMcp(workloads, server?.name || undefined)
    ),
    defaultValues: DEFAULT_FORM_VALUES,
    reValidateMode: 'onChange',
    mode: 'onChange',
    ...(server
      ? {
          values: convertCreateRequestToFormData(
            server,
            groupedEnvVars.secrets,
            groupedEnvVars.envVars
          ),
        }
      : {}),
  })

  const onSubmitForm = (data: FormSchemaRemoteMcp) => {
    if (!server) return

    setIsSubmitting(true)
    if (error) setError(null)

    installServerMutation(
      {
        data,
      },
      {
        onSuccess: () => {
          checkServerStatus({ serverName: data.name, groupName: 'default' })
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

  if (!server) return null

  const authType = form.watch('auth_type')
  const isLoading = isSubmitting

  return (
    <DialogWorkloadFormWrapper
      onOpenChange={closeDialog}
      isOpen={isOpen}
      onCloseAutoFocus={() => {
        form.reset()
      }}
      actionsOnCancel={closeDialog}
      actionsIsDisabled={isLoading}
      form={form}
      onSubmit={form.handleSubmit(onSubmitForm)}
      title={`Add ${server?.name} remote MCP server`}
    >
      {isLoading && (
        <LoadingStateAlert
          isPendingSecrets={isPendingSecrets}
          loadingSecrets={loadingSecrets}
        />
      )}
      {!isSubmitting && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="px-6 pb-4">
            {error && (
              <AlertErrorFormSubmission
                error={error}
                isErrorSecrets={isErrorSecrets}
                onDismiss={() => setError(null)}
              />
            )}
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-6">
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
                      disabled={isSubmitting}
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
                      The transport protocol the MCP server uses to communicate
                      with clients.
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
                      authenticate clients. Refer to the{' '}
                      <a
                        rel="noopener noreferrer"
                        className="flex cursor-pointer items-center gap-1
                          underline"
                        href="https://docs.stacklok.com/toolhive/guides-ui/run-mcp-servers#configure-server"
                        target="_blank"
                      >
                        documentation <ExternalLinkIcon size={12} />
                      </a>
                    </TooltipInfoIcon>
                  </div>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? 'none'}
                      name={field.name}
                    >
                      <SelectTrigger id={field.name} className="w-full">
                        <SelectValue placeholder="Select authorization method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Dynamic Client Registration
                        </SelectItem>
                        <SelectItem value="oauth2">OAuth 2.0</SelectItem>
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
        </div>
      )}
    </DialogWorkloadFormWrapper>
  )
}
