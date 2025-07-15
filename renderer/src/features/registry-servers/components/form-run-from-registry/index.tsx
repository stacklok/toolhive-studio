import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { useForm } from 'react-hook-form'
import type { RegistryImageMetadata } from '@/common/api/generated/types.gen'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useMemo, useState } from 'react'
import { groupEnvVars } from '../../lib/group-env-vars'
import {
  getFormSchemaRunFromRegistry,
  type FormSchemaRunFromRegistry,
} from '../../lib/get-form-schema-run-from-registry'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { useRunFromRegistry } from '../../hooks/use-run-from-registry'
import { LoadingStateAlert } from '../loading-state-alert'
import { NetworkIsolationTabContent } from './network-isolation-tab-content'
import { ConfigurationTabContent } from './configuration-tab-content'
import { Tabs, TabsList, TabsTrigger } from '@/common/components/ui/tabs'
import { Form } from '@/common/components/ui/form'
import { isFeatureEnabled } from '@/feature-flags'

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
      console.debug('👉 onSecretError', error, variables)
    },
  })

  const { data } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
  })

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
      secrets: groupedEnvVars.secrets.map((s) => ({
        name: s.name || '',
        value: { secret: s.default || '', isFromStore: false },
      })),
      envVars: groupedEnvVars.envVars.map((e) => ({
        name: e.name || '',
        value: e.default || '',
      })),
      networkIsolation: false,
      allowedPorts: [],
      allowedHosts: [],
    },
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

  const [tabValue, setTabValue] = useState('configuration')

  // Map each field to its tab
  const FIELD_TAB_MAP = [
    { field: 'serverName', tab: 'configuration' },
    { field: 'cmd_arguments', tab: 'configuration' },
    { field: 'secrets', tab: 'configuration' },
    { field: 'envVars', tab: 'configuration' },
    { field: 'allowedHosts', tab: 'network-isolation' },
    { field: 'allowedPorts', tab: 'network-isolation' },
    { field: 'networkIsolation', tab: 'network-isolation' },
  ]

  function activateTabWithError(errors: Record<string, unknown>) {
    const errorKeys = Object.keys(errors)
    // Extract root field name from error key (handles dot and bracket notation)
    const getRootField = (key: string) => key.split(/[.[]/)[0]
    // Find the first tab that has an error
    const tabWithError = FIELD_TAB_MAP.find(({ field }) =>
      errorKeys.some((key) => getRootField(key) === field)
    )?.tab
    if (tabWithError) {
      setTabValue(tabWithError)
    }
    // Debug output

    console.log(
      '[activateTabWithError] errorKeys:',
      errorKeys,
      'activatedTab:',
      tabWithError
    )
  }

  if (!server) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 sm:max-w-2xl"
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
                {isFeatureEnabled('network-isolation') && (
                  <Tabs
                    className="mb-6 w-full px-6"
                    value={tabValue}
                    onValueChange={setTabValue}
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
                )}
                {tabValue === 'configuration' && (
                  <ConfigurationTabContent
                    error={error}
                    isErrorSecrets={isErrorSecrets}
                    setError={setError}
                    form={form}
                    groupedEnvVars={groupedEnvVars}
                  />
                )}
                {tabValue === 'network-isolation' && (
                  <NetworkIsolationTabContent form={form} />
                )}
              </>
            )}

            <DialogFooter className="p-6">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
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
