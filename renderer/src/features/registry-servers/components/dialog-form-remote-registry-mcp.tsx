import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import type { RegistryRemoteServerMetadata } from '@common/api/generated/types.gen'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { getApiV1BetaWorkloadsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { LoadingStateAlert } from '../../../common/components/secrets/loading-state-alert'
import { AlertErrorFormSubmission } from '@/common/components/workloads/alert-error-form-submission'
import { DialogWorkloadFormWrapper } from '@/common/components/workloads/dialog-workload-form-wrapper'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'
import { delay } from '@utils/delay'
import { UI_POST_SUBMIT_DELAY_MS } from '@/common/lib/constants'
import {
  getFormSchemaRemoteMcp,
  type FormSchemaRemoteMcp,
} from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { convertCreateRequestToFormData } from '../lib/orchestrate-run-remote-registry-server'
import { useRunRemoteServer } from '@/features/mcp-servers/hooks/use-run-remote-server'
import { FormFieldsAuth } from '@/features/mcp-servers/components/remote-mcp/form-fields-auth'
import { useGroups } from '@/features/mcp-servers/hooks/use-groups'
import { FormFieldsRemoteMcp } from '@/common/components/workloads/form-fields-remote-mcp'
import { REMOTE_MCP_AUTH_TYPES } from '@/common/lib/form-schema-mcp'

const DEFAULT_FORM_VALUES: FormSchemaRemoteMcp = {
  name: '',
  transport: 'streamable-http',
  proxy_port: undefined,
  auth_type: REMOTE_MCP_AUTH_TYPES.AutoDiscovered,
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
  group: 'default',
}

interface FormRunFromRegistryProps {
  server: RegistryRemoteServerMetadata | null
  isOpen: boolean
  closeDialog: () => void
  onSubmitSuccess?: (closeModal: () => void) => void
  hardcodedGroup?: string
  actionsSubmitLabel: string
  description?: string
  quietly?: boolean
  customSuccessMessage?: string
  customLoadingMessage?: string
}

export function DialogFormRemoteRegistryMcp({
  server,
  isOpen,
  closeDialog,
  onSubmitSuccess,
  hardcodedGroup,
  actionsSubmitLabel,
  description,
  quietly = false,
  customSuccessMessage,
  customLoadingMessage,
}: FormRunFromRegistryProps) {
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
      pageName: 'registry',
      onSecretSuccess: handleSecrets,
      onSecretError: (error, variables) => {
        log.error('onSecretError', error, variables)
      },
      quietly,
    })

  const { data } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
    retry: false,
  })

  const workloads = data?.workloads ?? []

  const { data: groupsData } = useGroups()
  const groups = groupsData?.groups ?? []

  const form = useForm<FormSchemaRemoteMcp>({
    resolver: zodV4Resolver(getFormSchemaRemoteMcp(workloads)),
    defaultValues: DEFAULT_FORM_VALUES,
    reValidateMode: 'onChange',
    mode: 'onChange',
    ...(server
      ? {
          values: convertCreateRequestToFormData(server),
        }
      : {}),
  })

  const onSubmitForm = async (data: FormSchemaRemoteMcp) => {
    if (!server) return

    setIsSubmitting(true)
    if (error) setError(null)

    const submissionData = hardcodedGroup
      ? { ...data, group: hardcodedGroup }
      : data

    installServerMutation(
      {
        data: submissionData,
      },
      {
        onSettled: (_, error) => {
          void (async () => {
            // Add a short delay before hiding the loading screen
            // This stops jarring flashes when workloads finish too fast and clarifies progress
            await delay(UI_POST_SUBMIT_DELAY_MS)
            setIsSubmitting(false)
            if (!error) {
              form.reset()
            }
            if (onSubmitSuccess) {
              onSubmitSuccess(closeDialog)
            } else {
              closeDialog()
            }

            // Show readiness toast only after closing, and only on final step
            if (!error && !quietly) {
              void checkServerStatus({
                serverName: submissionData.name,
                groupName: submissionData.group || 'default',
                quietly,
                customSuccessMessage,
                customLoadingMessage,
              })
            }
          })()
        },
        onError: (error) => {
          setError(typeof error === 'string' ? error : error.message)
        },
      }
    )
  }

  const authType = useWatch({ control: form.control, name: 'auth_type' })
  const isLoading = isSubmitting

  if (!server) return null

  return (
    <DialogWorkloadFormWrapper
      onOpenChange={closeDialog}
      isOpen={isOpen}
      onCloseAutoFocus={() => {
        form.reset()
      }}
      actionsOnCancel={closeDialog}
      actionsIsDisabled={isLoading}
      actionsSubmitLabel={actionsSubmitLabel}
      form={form}
      onSubmit={form.handleSubmit(onSubmitForm)}
      title={`Add ${server?.name} remote MCP server`}
      description={description}
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
            <FormFieldsRemoteMcp
              control={form.control}
              groups={groups}
              isEditing={isSubmitting}
            />
            <FormFieldsAuth authType={authType} form={form} />
          </div>
        </div>
      )}
    </DialogWorkloadFormWrapper>
  )
}
