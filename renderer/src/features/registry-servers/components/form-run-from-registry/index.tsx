import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import type { RegistryImageMetadata } from '@api/types.gen'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { groupEnvVars } from '../../lib/group-env-vars'
import {
  getFormSchemaRunFromRegistry,
  type FormSchemaRunFromRegistry,
} from '../../lib/get-form-schema-run-from-registry'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import { useRunFromRegistry } from '../../hooks/use-run-from-registry'
import { LoadingStateAlert } from '../../../../common/components/secrets/loading-state-alert'
import { NetworkIsolationTabContent } from '../../../network-isolation/components/network-isolation-tab-content'
import { ConfigurationTabContent } from './configuration-tab-content'
import { Tabs, TabsList, TabsTrigger } from '@/common/components/ui/tabs'
import { Form } from '@/common/components/ui/form'
import {
  useFormTabState,
  type FieldTabMapping,
} from '@/common/hooks/use-form-tab-state'

type Tab = 'configuration' | 'network-isolation'
type Field = keyof FormSchemaRunFromRegistry

const FIELD_TAB_MAP = {
  serverName: 'configuration',
  cmd_arguments: 'configuration',
  secrets: 'configuration',
  envVars: 'configuration',
  allowedHosts: 'network-isolation',
  allowedPorts: 'network-isolation',
  networkIsolation: 'network-isolation',
  volumes: 'configuration',
} as const satisfies FieldTabMapping<Tab, Field>

interface FormRunFromRegistryProps {
  server: RegistryImageMetadata | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function FormRunFromRegistry({
  server,
  isOpen,
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
  const {
    installServerMutation,
    checkServerStatus,
    isErrorSecrets,
    isPendingSecrets,
  } = useRunFromRegistry({
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
      getFormSchemaRunFromRegistry({
        envVars: groupedEnvVars.envVars,
        secrets: groupedEnvVars.secrets,
        workloads: data?.workloads ?? [],
      }),
    [groupedEnvVars, data?.workloads]
  )

  const form = useForm<FormSchemaRunFromRegistry>({
    resolver: zodV4Resolver(formSchema),
    defaultValues: {
      serverName: server?.name || '',
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

  const onSubmitForm = (data: FormSchemaRunFromRegistry) => {
    if (!server) return

    setIsSubmitting(true)
    if (error) setError(null)

    // Use the dedicated function to prepare the API payload
    installServerMutation(
      {
        server,
        data,
      },
      {
        onSuccess: () => {
          checkServerStatus(data)
          onOpenChange(false)
          setActiveTab('configuration')
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 sm:max-w-2xl"
        onCloseAutoFocus={() => {
          form.reset()
          resetTab()
        }}
        onInteractOutside={(e) => {
          // Prevent closing the dialog when clicking outside
          e.preventDefault()
        }}
      >
        <Form {...form} key={server?.name}>
          <form
            onSubmit={form.handleSubmit(onSubmitForm, activateTabWithError)}
            className="mx-auto flex h-full w-full max-w-3xl flex-col"
          >
            <DialogHeader className="mb-4 p-6">
              <DialogTitle>Configure {server.name}</DialogTitle>
              <DialogDescription className="sr-only">
                Set up the environment variables and name for this MCP server
                installation.
              </DialogDescription>
            </DialogHeader>
            {isSubmitting && (
              <LoadingStateAlert
                isPendingSecrets={isPendingSecrets}
                loadingSecrets={loadingSecrets}
              />
            )}
            {!isSubmitting && (
              <>
                <Tabs
                  className="mb-6 w-full px-6"
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
                  <ConfigurationTabContent
                    error={error}
                    isErrorSecrets={isErrorSecrets}
                    setError={setError}
                    form={form}
                    groupedEnvVars={groupedEnvVars}
                  />
                )}
                {activeTab === 'network-isolation' && (
                  <NetworkIsolationTabContent form={form} />
                )}
              </>
            )}

            <DialogFooter className="p-6">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  onOpenChange(false)
                  setActiveTab('configuration')
                }}
              >
                Cancel
              </Button>
              <Button disabled={isSubmitting} type="submit">
                Install server
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
