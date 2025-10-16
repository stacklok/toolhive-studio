import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import {
  getApiV1BetaWorkloadsOptions,
  getApiV1BetaWorkloadsByNameOptions,
  getApiV1BetaSecretsDefaultKeysOptions,
} from '@api/@tanstack/react-query.gen'
import { convertCreateRequestToFormData } from '../../lib/orchestrate-run-local-server'
import { useUpdateServer } from '../../hooks/use-update-server'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { FormFieldsArrayCustomEnvVars } from '../form-fields-array-custom-env-vars'
import { FormFieldsArrayCustomSecrets } from '../form-fields-array-custom-secrets'
import { useRunCustomServer } from '../../hooks/use-run-custom-server'
import { LoadingStateAlert } from '@/common/components/secrets/loading-state-alert'
import { AlertErrorFormSubmission } from '@/common/components/workloads/alert-error-form-submission'
import { Tabs, TabsList, TabsTrigger } from '@/common/components/ui/tabs'
import {
  useFormTabState,
  type FieldTabMapping,
} from '@/common/hooks/use-form-tab-state'
import { NetworkIsolationTabContent } from '../network-isolation-tab-content'
import { FormFieldsArrayVolumes } from '../form-fields-array-custom-volumes'
import { FormFieldsBase } from './form-fields-base'
import {
  getFormSchemaLocalMcp,
  type FormSchemaLocalMcp,
} from '../../lib/form-schema-local-mcp'
import { DialogWorkloadFormWrapper } from '@/common/components/workloads/dialog-workload-form-wrapper'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'
import { useGroups } from '@/features/mcp-servers/hooks/use-groups'
import { AlertErrorFetchingEditingData } from '@/common/components/workloads/alert-error-fetching-editing-data'

type Tab = 'configuration' | 'network-isolation'
type CommonFields = keyof FormSchemaLocalMcp
type VariantSpecificFields = 'image' | 'protocol' | 'package_name'
type Field = CommonFields | VariantSpecificFields

const FIELD_TAB_MAP = {
  name: 'configuration',
  group: 'configuration',
  transport: 'configuration',
  type: 'configuration',
  image: 'configuration',
  protocol: 'configuration',
  package_name: 'configuration',
  target_port: 'configuration',
  cmd_arguments: 'configuration',
  envVars: 'configuration',
  secrets: 'configuration',
  allowedHosts: 'network-isolation',
  allowedPorts: 'network-isolation',
  networkIsolation: 'network-isolation',
  volumes: 'configuration',
} satisfies FieldTabMapping<Tab, Field>

const DEFAULT_FORM_VALUES = {
  type: 'docker_image',
  name: '',
  transport: 'stdio',
  image: '',
  protocol: '',
  package_name: '',
  target_port: 0,
  networkIsolation: false,
  allowedHosts: [],
  allowedPorts: [],
  volumes: [{ host: '', container: '', accessMode: 'rw' as const }],
  envVars: [],
  secrets: [],
  cmd_arguments: [],
} as Partial<FormSchemaLocalMcp>

export function DialogFormLocalMcp({
  isOpen,
  closeDialog,
  serverToEdit,
  groupName,
}: {
  isOpen: boolean
  closeDialog: () => void
  serverToEdit?: string | null
  groupName: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingSecrets, setLoadingSecrets] = useState<{
    text: string
    completedCount: number
    secretsCount: number
  } | null>(null)
  const { activeTab, setActiveTab, activateTabWithError, resetTab } =
    useFormTabState<Tab, Field>({
      fieldTabMap: FIELD_TAB_MAP,
      defaultTab: 'configuration',
    })
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
    useRunCustomServer({
      onSecretSuccess: handleSecrets,
      onSecretError: (error, variables) => {
        log.error('onSecretError', error, variables)
      },
      groupName,
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

  const { updateServerMutation } = useUpdateServer(serverToEdit || '', {
    onSecretSuccess: handleSecrets,
    onSecretError: (error, variables) => {
      log.error('onSecretError during update', error, variables)
    },
  })
  const isEditing = !!existingServer && !!serverToEdit
  const editingFormData =
    isEditing &&
    convertCreateRequestToFormData(existingServer, availableSecrets)

  const { data: groupsData } = useGroups()
  const groups = groupsData?.groups ?? []

  const form = useForm<FormSchemaLocalMcp>({
    resolver: zodV4Resolver(
      getFormSchemaLocalMcp(workloads, serverToEdit || undefined)
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

  const onSubmitForm = (data: FormSchemaLocalMcp) => {
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
            <Tabs
              className="mb-6 w-full flex-shrink-0 px-6"
              value={activeTab}
              onValueChange={(value: string) => setActiveTab(value as Tab)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="network-isolation">
                  Network Isolation
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {activeTab === 'configuration' && (
              <div className="flex-1 space-y-4 overflow-y-auto px-6">
                <FormFieldsBase
                  form={form}
                  isEditing={isEditing}
                  groups={groups}
                />
                <FormFieldsArrayCustomSecrets form={form} />
                <FormFieldsArrayCustomEnvVars form={form} />
                <FormFieldsArrayVolumes<FormSchemaLocalMcp> form={form} />
              </div>
            )}
            {activeTab === 'network-isolation' && (
              <div className="flex-1 overflow-y-auto">
                <NetworkIsolationTabContent form={form} />
              </div>
            )}
          </div>
        )}
      </>
    )
  }, [
    isLoading,
    isExistingServerDataError,
    isPendingSecrets,
    isSubmitting,
    isEditing,
    isLoadingServer,
    loadingSecrets,
    error,
    isErrorSecrets,
    setError,
    activeTab,
    setActiveTab,
    form,
    groups,
    serverToEdit,
  ])

  return (
    <DialogWorkloadFormWrapper
      onOpenChange={closeDialog}
      isOpen={isOpen}
      onCloseAutoFocus={() => {
        form.reset()
        resetTab()
      }}
      actionsOnCancel={() => {
        closeDialog()
        setActiveTab('configuration')
      }}
      actionsIsDisabled={isLoading || isExistingServerDataError}
      actionsIsEditing={isEditing}
      form={form}
      onSubmit={form.handleSubmit(onSubmitForm, activateTabWithError)}
      title={
        isEditing
          ? `Edit ${serverToEdit} MCP server`
          : 'Custom local MCP server'
      }
    >
      {renderContent()}
    </DialogWorkloadFormWrapper>
  )
}
