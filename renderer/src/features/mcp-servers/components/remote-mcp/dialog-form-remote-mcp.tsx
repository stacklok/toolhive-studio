import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
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
import { FormFieldsAuth } from './form-fields-auth'
import { useRunRemoteServer } from '../../hooks/use-run-remote-server'
import log from 'electron-log/renderer'
import { useCallback, useState } from 'react'
import { useUpdateServer } from '../../hooks/use-update-server'
import {
  getApiV1BetaSecretsDefaultKeysOptions,
  getApiV1BetaWorkloadsByNameOptions,
  getApiV1BetaWorkloadsOptions,
} from '@api/@tanstack/react-query.gen'
import { useQuery } from '@tanstack/react-query'
import { convertCreateRequestToFormData } from '../../lib/orchestrate-run-remote-server'
import { LoadingStateAlert } from '@/common/components/secrets/loading-state-alert'
import { AlertErrorFormSubmission } from '@/common/components/workloads/alert-error-form-submission'
import { DialogWorkloadFormWrapper } from '@/common/components/workloads/dialog-workload-form-wrapper'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'
import {
  getFormSchemaRemoteMcp,
  type FormSchemaRemoteMcp,
} from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { ExternalLinkIcon } from 'lucide-react'
import { useGroups } from '../../hooks/use-groups'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../../utils/feature-flags'
import { AlertErrorFetchingEditingData } from '@/common/components/workloads/alert-error-fetching-editing-data'

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
  secrets: [],
  url: '',
  group: '',
}

export function DialogFormRemoteMcp({
  closeDialog,
  isOpen,
  serverToEdit,
  groupName,
}: {
  closeDialog: () => void
  serverToEdit?: string | null
  isOpen: boolean
  groupName: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingSecrets, setLoadingSecrets] = useState<{
    text: string
    completedCount: number
    secretsCount: number
  } | null>(null)
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
      pageName: '/',
      onSecretSuccess: handleSecrets,
      onSecretError: (error, variables) => {
        log.error('onSecretError', error, variables)
      },
    })

  const { updateServerMutation } = useUpdateServer(serverToEdit || '', {
    isRemote: true,
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

  const {
    data: existingServerData,
    isLoading: isLoadingServer,
    isError: isExistingServerDataError,
  } = useQuery({
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

  const { data: groupsData } = useGroups()
  const groups = groupsData?.groups ?? []
  const isGroupsEnabled = useFeatureFlag(featureFlagKeys.GROUPS)

  const form = useForm<FormSchemaRemoteMcp>({
    resolver: zodV4Resolver(
      getFormSchemaRemoteMcp(workloads, serverToEdit || undefined)
    ),
    defaultValues: { ...DEFAULT_FORM_VALUES, group: groupName },
    reValidateMode: 'onChange',
    mode: 'onChange',
    ...(editingFormData
      ? {
          values: {
            ...editingFormData,
            group: existingServer?.group ?? groupName,
          },
        }
      : {}),
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
            checkServerStatus({
              serverName: data.name,
              groupName: data.group || groupName,
              isEditing,
            })
            closeDialog()
            form.reset()
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
            checkServerStatus({
              serverName: data.name,
              groupName: data.group || groupName,
            })
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
  const isLoading = isSubmitting || (isEditing && isLoadingServer)

  const renderContent = useCallback(() => {
    if (!isLoading && isExistingServerDataError) {
      return (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="px-6 pb-4">
            <AlertErrorFetchingEditingData />
          </div>
        </div>
      )
    }

    return (
      <>
        {isLoading && (
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
                        disabled={isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isGroupsEnabled && (
                <FormField
                  control={form.control}
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
              )}

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
                        The transport protocol the MCP server uses to
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
                      <TooltipInfoIcon
                        className="flex flex-wrap items-center gap-1"
                      >
                        The authorization method the MCP server uses to
                        authenticate clients. Refer to the{' '}
                        <a
                          rel="noopener noreferrer"
                          className="flex cursor-pointer items-center gap-1
                            underline"
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
            </div>
          </div>
        )}
      </>
    )
  }, [
    form,
    isLoading,
    isExistingServerDataError,
    isPendingSecrets,
    isSubmitting,
    isEditing,
    isLoadingServer,
    loadingSecrets,
    error,
    isErrorSecrets,
    serverToEdit,
    authType,
    isGroupsEnabled,
    groups,
    setError,
  ])

  return (
    <DialogWorkloadFormWrapper
      onOpenChange={closeDialog}
      isOpen={isOpen}
      onCloseAutoFocus={() => {
        form.reset()
      }}
      actionsOnCancel={closeDialog}
      actionsIsDisabled={isLoading || isExistingServerDataError}
      actionsIsEditing={isEditing}
      form={form}
      onSubmit={form.handleSubmit(onSubmitForm)}
      title={
        isEditing
          ? `Edit ${serverToEdit} remote MCP server`
          : 'Add a remote MCP server'
      }
    >
      {renderContent()}
    </DialogWorkloadFormWrapper>
  )
}
