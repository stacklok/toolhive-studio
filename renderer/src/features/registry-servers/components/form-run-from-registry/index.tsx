import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import type { RegistryImageMetadata } from '@api/types.gen'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { groupEnvVars } from '../../lib/group-env-vars'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import { useRunFromRegistry } from '../../hooks/use-run-from-registry'
import { LoadingStateAlert } from '../../../../common/components/secrets/loading-state-alert'
import { NetworkIsolationTabContent } from '../../../network-isolation/components/network-isolation-tab-content'
import { ConfigurationTabContent } from './configuration-tab-content'
import { Tabs, TabsList, TabsTrigger } from '@/common/components/ui/tabs'
import {
  useFormTabState,
  type FieldTabMapping,
} from '@/common/hooks/use-form-tab-state'
import {
  getFormSchemaRegistryMcp,
  type FormSchemaRegistryMcp,
} from '../../lib/form-schema-registry-mcp'
import { AlertErrorFormSubmission } from '@/common/components/workloads/alert-error-form-submission'
import { DialogWorkloadFormWrapper } from '@/common/components/workloads/dialog-workload-form-wrapper'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'

type Tab = 'configuration' | 'network-isolation'
type Field = keyof FormSchemaRegistryMcp

const FIELD_TAB_MAP = {
  name: 'configuration',
  group: 'configuration',
  cmd_arguments: 'configuration',
  secrets: 'configuration',
  envVars: 'configuration',
  allowedHosts: 'network-isolation',
  allowedPorts: 'network-isolation',
  networkIsolation: 'network-isolation',
  volumes: 'configuration',
  tools_override: 'configuration',
} as const satisfies FieldTabMapping<Tab, Field>

interface FormRunFromRegistryProps {
  server: RegistryImageMetadata | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  wizardContext?: {
    onNext: (groupName: string) => void
    hasMoreServers: boolean
  }
}

export function FormRunFromRegistry({
  server,
  isOpen,
  wizardContext,
  onOpenChange,
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
  const { installServerMutation, isErrorSecrets, isPendingSecrets } =
    useRunFromRegistry({
      onSecretSuccess: (completedCount, secretsCount) => {
        setLoadingSecrets((prev) => ({
          ...prev,
          text: `Encrypting secrets (${completedCount} of ${secretsCount})...`,
          completedCount,
          secretsCount,
        }))
      },
      onSecretError: (error, variables) => {
        log.error('onSecretError', error, variables)
      },
    })
  const { activeTab, setActiveTab, activateTabWithError, resetTab } =
    useFormTabState<Tab, Field>({
      fieldTabMap: FIELD_TAB_MAP,
      defaultTab: 'configuration',
    })

  const { data } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
  })
  const cmd_arguments =
    server?.args && server.args.length > 0 ? server.args : []
  const formSchema = useMemo(
    () =>
      getFormSchemaRegistryMcp({
        envVars: groupedEnvVars.envVars,
        secrets: groupedEnvVars.secrets,
        workloads: data?.workloads ?? [],
      }),
    [groupedEnvVars, data?.workloads]
  )

  const form = useForm<FormSchemaRegistryMcp>({
    resolver: zodV4Resolver(formSchema),
    defaultValues: {
      name: server?.name || '',
      group: 'default',
      cmd_arguments,
      volumes: [{ host: '', container: '', accessMode: 'rw' }],
      secrets: groupedEnvVars.secrets.map((s) => ({
        name: s.name || '',
        value: { secret: s.default || '', isFromStore: false },
      })),
      envVars: groupedEnvVars.envVars.map((e) => ({
        name: e.name || '',
        value: e.default || '',
      })),
      networkIsolation: false,
      allowedHosts: server?.permissions?.network?.outbound?.allow_host
        ? server.permissions.network.outbound.allow_host.map((host) => ({
            value: host,
          }))
        : [],
      allowedPorts: server?.permissions?.network?.outbound?.allow_port
        ? server.permissions.network.outbound.allow_port.map((port) => ({
            value: port.toString(),
          }))
        : [],
    },
    reValidateMode: 'onChange',
    mode: 'onChange',
  })

  const onSubmitForm = (data: FormSchemaRegistryMcp) => {
    if (!server) return

    setIsSubmitting(true)
    if (error) setError(null)

    // Use the dedicated function to prepare the API payload
    installServerMutation(
      {
        server,
        data,
        groupName: data.group,
      },
      {
        onSuccess: () => {
          checkServerStatus({
            serverName: data.name,
            groupName: data.group,
          })
          if (wizardContext?.hasMoreServers) {
            wizardContext.onNext(data.group)
            setActiveTab('configuration')
          } else {
            wizardContext?.onNext(data.group)
            onOpenChange(false)
            setActiveTab('configuration')
          }
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

  return (
    <DialogWorkloadFormWrapper
      onOpenChange={onOpenChange}
      isOpen={isOpen}
      onCloseAutoFocus={() => {
        form.reset()
        resetTab()
      }}
      actionsOnCancel={() => {
        onOpenChange(false)
        setActiveTab('configuration')
      }}
      actionsIsDisabled={isSubmitting}
      actionsSubmitLabel={
        wizardContext
          ? wizardContext.hasMoreServers
            ? 'Next'
            : 'Finish'
          : undefined
      }
      form={form}
      onSubmit={form.handleSubmit(onSubmitForm, activateTabWithError)}
      title={`Configure ${server.name}`}
    >
      {isSubmitting && (
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
            <ConfigurationTabContent
              form={form}
              groupedEnvVars={groupedEnvVars}
            />
          )}
          {activeTab === 'network-isolation' && (
            <div className="flex-1 overflow-y-auto">
              <NetworkIsolationTabContent form={form} />
            </div>
          )}
        </div>
      )}
    </DialogWorkloadFormWrapper>
  )
}
