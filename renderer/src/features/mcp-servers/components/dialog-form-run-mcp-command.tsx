import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { Form } from '@/common/components/ui/form'
import {
  getFormSchemaRunMcpCommand,
  type FormSchemaRunMcpCommand,
} from '../lib/form-schema-run-mcp-server-with-command'
import { FormFieldsRunMcpCommand } from './form-fields-run-mcp-command'
import {
  getApiV1BetaWorkloadsOptions,
  getApiV1BetaWorkloadsByNameOptions,
  getApiV1BetaSecretsDefaultKeysOptions,
} from '@api/@tanstack/react-query.gen'
import { convertCreateRequestToFormData } from '../lib/orchestrate-run-custom-server'
import { useUpdateServer } from '../hooks/use-update-server'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { FormFieldsArrayCustomEnvVars } from './form-fields-array-custom-env-vars'
import { FormFieldsArrayCustomSecrets } from './form-fields-array-custom-secrets'
import { useRunCustomServer } from '../hooks/use-run-custom-server'
import { LoadingStateAlert } from '@/common/components/secrets/loading-state-alert'
import { AlertErrorFormSubmission } from '@/common/components/workloads/alert-error-form-submission'
import { Tabs, TabsList, TabsTrigger } from '@/common/components/ui/tabs'
import {
  useFormTabState,
  type FieldTabMapping,
} from '@/common/hooks/use-form-tab-state'
import { NetworkIsolationTabContent } from './network-isolation-tab-content'
import { FormFieldsArrayVolumes } from './form-fields-array-custom-volumes'

type Tab = 'configuration' | 'network-isolation'
type CommonFields = keyof FormSchemaRunMcpCommand
type VariantSpecificFields = 'image' | 'protocol' | 'package_name'
type Field = CommonFields | VariantSpecificFields

const FIELD_TAB_MAP = {
  name: 'configuration',
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

const DEFAULT_FORM_VALUES: Partial<FormSchemaRunMcpCommand> = {
  type: 'docker_image',
  name: '',
  transport: 'stdio',
  target_port: 0,
  networkIsolation: false,
  allowedHosts: [],
  allowedPorts: [],
  volumes: [{ host: '', container: '', accessMode: 'rw' as const }],
  envVars: [],
  secrets: [],
  cmd_arguments: [],
}

export function DialogFormRunMcpServerWithCommand({
  isOpen,
  onOpenChange,
  serverToEdit,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  serverToEdit?: string | null
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
  } = useRunCustomServer({
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

  // Fetch all workloads for validation (to check for duplicate names)
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

  const form = useForm<FormSchemaRunMcpCommand>({
    resolver: zodV4Resolver(
      getFormSchemaRunMcpCommand(workloads, serverToEdit || undefined)
    ),
    defaultValues: DEFAULT_FORM_VALUES,
    reValidateMode: 'onChange',
    mode: 'onChange',
  })

  // Reset form with workload data when editing
  useEffect(() => {
    if (isEditing && existingServer) {
      const formData = convertCreateRequestToFormData(
        existingServer,
        availableSecrets
      )

      form.reset(formData)
    } else if (!isEditing) {
      form.reset(DEFAULT_FORM_VALUES)
    }
  }, [isEditing, existingServer, availableSecrets, serverToEdit, form])

  const onSubmitForm = (data: FormSchemaRunMcpCommand) => {
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
            onOpenChange(false)
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
      // Handle create case
      installServerMutation(
        { data },
        {
          onSuccess: () => {
            checkServerStatus(data)
            onOpenChange(false)
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[95dvh] flex-col p-0 sm:max-w-2xl"
        onCloseAutoFocus={() => {
          form.reset()
          resetTab()
        }}
        onInteractOutside={(e) => {
          // Prevent closing the dialog when clicking outside
          e.preventDefault()
        }}
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmitForm, activateTabWithError)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogHeader className="mb-4 flex-shrink-0 p-6">
              <DialogTitle>
                {isEditing
                  ? `Edit ${serverToEdit} MCP server`
                  : 'Custom MCP server'}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Update the configuration for your MCP server.'
                  : 'ToolHive allows you to securely run a custom MCP server from a Docker image or a package manager command.'}
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
              <div className="flex flex-1 flex-col overflow-hidden">
                <Tabs
                  className="mb-6 w-full flex-shrink-0 px-6"
                  value={activeTab}
                  onValueChange={(value: string) => setActiveTab(value as Tab)}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="configuration">
                      Configuration
                    </TabsTrigger>
                    <TabsTrigger value="network-isolation">
                      Network Isolation
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {activeTab === 'configuration' && (
                  <div className="flex-1 space-y-4 overflow-y-auto px-6">
                    {error && (
                      <AlertErrorFormSubmission
                        error={error}
                        isErrorSecrets={isErrorSecrets}
                        onDismiss={() => setError(null)}
                      />
                    )}
                    <FormFieldsRunMcpCommand
                      form={form}
                      isEditing={isEditing}
                    />
                    <FormFieldsArrayCustomSecrets form={form} />
                    <FormFieldsArrayCustomEnvVars form={form} />
                    <FormFieldsArrayVolumes<FormSchemaRunMcpCommand>
                      form={form}
                    />
                  </div>
                )}
                {activeTab === 'network-isolation' && (
                  <div className="flex-1 overflow-y-auto">
                    <NetworkIsolationTabContent form={form} />
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex-shrink-0 p-6">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || (isEditing && isLoadingServer)}
                onClick={() => {
                  onOpenChange(false)
                  setActiveTab('configuration')
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
