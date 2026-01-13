import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useForm, useWatch } from 'react-hook-form'
import { FormFieldsAuth } from './form-fields-auth'
import { useRunRemoteServer } from '../../hooks/use-run-remote-server'
import log from 'electron-log/renderer'
import { useCallback, useState, useMemo } from 'react'
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
import { useGroups } from '../../hooks/use-groups'
import { AlertErrorFetchingEditingData } from '@/common/components/workloads/alert-error-fetching-editing-data'
import { FormFieldsProxy } from '@/common/components/workloads/form-fields-proxy'
import { UI_POST_SUBMIT_DELAY_MS } from '@/common/lib/constants'
import { delay } from '@utils/delay'
import {
  FromFieldRemoteAuthType,
  FromFieldRemoteGroup,
  FromFieldRemoteServerName,
  FromFieldRemoteTransport,
  FromFieldRemoteUrl,
} from '@/common/components/workloads/form-fields-remote-mcp'
import { REMOTE_MCP_AUTH_TYPES } from '@/common/lib/form-schema-mcp'

const DEFAULT_FORM_VALUES: FormSchemaRemoteMcp = {
  name: '',
  transport: 'streamable-http',
  proxy_mode: 'streamable-http',
  proxy_port: undefined,
  auth_type: REMOTE_MCP_AUTH_TYPES.None,
  oauth_config: {
    authorize_url: '',
    client_id: '',
    client_secret: undefined,
    bearer_token: undefined,
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
  const groups = useMemo(() => groupsData?.groups ?? [], [groupsData])

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

  const finishAfterDelay = async (
    error: unknown,
    opts: { clearSecrets?: boolean } = {}
  ) => {
    await delay(UI_POST_SUBMIT_DELAY_MS)
    setIsSubmitting(false)
    if (opts.clearSecrets) setLoadingSecrets(null)
    if (!error) {
      form.reset()
    }
  }

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
          onSettled: async (_, error) => {
            // Delay to avoid jarring flashes and communicate progress
            await finishAfterDelay(error, { clearSecrets: true })
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
          onSettled: async (_, error) => {
            // Delay to avoid jarring flashes and communicate progress
            await finishAfterDelay(error)
          },
          onError: (error) => {
            setError(typeof error === 'string' ? error : error.message)
          },
        }
      )
    }
  }

  const authType = useWatch({ control: form.control, name: 'auth_type' })
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
              <FromFieldRemoteServerName
                control={form.control}
                isEditing={isEditing}
              />
              <FromFieldRemoteGroup control={form.control} groups={groups} />
              <FromFieldRemoteUrl control={form.control} />
              <FromFieldRemoteTransport control={form.control} />
              <FormFieldsProxy control={form.control} />
              <FromFieldRemoteAuthType control={form.control} />
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
      actionsSubmitLabel={isEditing ? 'Update server' : 'Install server'}
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
