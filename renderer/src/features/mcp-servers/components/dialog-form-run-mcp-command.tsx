import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { Form } from '@/common/components/ui/form'
import {
  getFormSchemaRunMcpCommand,
  type FormSchemaRunMcpCommand,
} from '../lib/form-schema-run-mcp-server-with-command'
import { FormFieldsRunMcpCommand } from './form-fields-run-mcp-command'
import { getApiV1BetaWorkloadsOptions } from '@/common/api/generated/@tanstack/react-query.gen'
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
import { isFeatureEnabled } from '@/feature-flags'
import { NetworkIsolationTabContent } from './network-isolation-tab-content'

// Map each field to its tab
const FIELD_TAB_MAP = [
  { field: 'name', tab: 'configuration' },
  { field: 'transport', tab: 'configuration' },
  { field: 'type', tab: 'configuration' },
  { field: 'image', tab: 'configuration' },
  { field: 'protocol', tab: 'configuration' },
  { field: 'package_name', tab: 'configuration' },
  { field: 'target_port', tab: 'configuration' },
  { field: 'cmd_arguments', tab: 'configuration' },
  { field: 'envVars', tab: 'configuration' },
  { field: 'secrets', tab: 'configuration' },
  { field: 'allowedHosts', tab: 'network-isolation' },
  { field: 'allowedPorts', tab: 'network-isolation' },
  { field: 'networkIsolation', tab: 'network-isolation' },
]

export function DialogFormRunMcpServerWithCommand({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingSecrets, setLoadingSecrets] = useState<{
    text: string
    completedCount: number
    secretsCount: number
  } | null>(null)
  const [tabValue, setTabValue] = useState('configuration')
  const {
    installServerMutation,
    checkServerStatus,
    isErrorSecrets,
    isPendingSecrets,
  } = useRunCustomServer({
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

  const { data } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
  })

  const workloads = data?.workloads ?? []

  const form = useForm<FormSchemaRunMcpCommand>({
    resolver: zodV4Resolver(getFormSchemaRunMcpCommand(workloads)),
    defaultValues: {
      type: 'docker_image',
      target_port: undefined,
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
    },
  })

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
  }

  const onSubmitForm = (data: FormSchemaRunMcpCommand) => {
    setIsSubmitting(true)
    if (error) {
      setError(null)
    }

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 sm:max-w-2xl"
        onCloseAutoFocus={() => form.reset()}
        onInteractOutside={(e) => {
          // Prevent closing the dialog when clicking outside
          e.preventDefault()
        }}
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmitForm, activateTabWithError)}
          >
            <DialogHeader className="mb-4 p-6">
              <DialogTitle>Custom MCP server</DialogTitle>
              <DialogDescription>
                ToolHive allows you to securely run a custom MCP server from a
                Docker image or a package manager command.
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
                    <FormFieldsRunMcpCommand form={form} />
                    <FormFieldsArrayCustomSecrets form={form} />
                    <FormFieldsArrayCustomEnvVars form={form} />
                  </div>
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
                onClick={() => {
                  onOpenChange(false)
                  setTabValue('configuration')
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
