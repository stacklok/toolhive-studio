import { usePrompt } from '@/common/hooks/use-prompt'
import type { UseFormReturn } from 'react-hook-form'
import { Label } from '@/common/components/ui/label'
import { Button } from '@/common/components/ui/button'
import { Switch } from '@/common/components/ui/switch'
import { Code } from 'lucide-react'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useManageClients } from '../hooks/use-manage-clients'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { trackEvent } from '@/common/lib/analytics'
import { useMcpOptimizerClients } from '@/features/meta-mcp/hooks/use-mcp-optimizer-clients'

interface ManageClientsButtonProps {
  groupName: string
  variant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'destructive'
  className?: string
}

export function ManageClientsButton({
  groupName,
  variant = 'outline',
  className,
}: ManageClientsButtonProps) {
  const { saveGroupClients } = useMcpOptimizerClients()
  const promptForm = usePrompt()

  const {
    installedClients,
    defaultValues,
    reconcileGroupClients,
    getClientFieldName,
  } = useManageClients(groupName)

  const { mutateAsync: saveClients } = useToastMutation({
    mutationFn: reconcileGroupClients,
    onSuccess: () => {
      saveGroupClients(groupName)
    },
    loadingMsg: 'Saving client settings...',
    successMsg: 'Client settings saved',
    errorMsg: 'Failed to save client settings',
  })

  const handleManageClients = async () => {
    const registeredClientsCount =
      Object.values(defaultValues).filter(Boolean).length

    trackEvent('Manage clients opened', {
      is_default_group: String(groupName === 'default'),
      installed_clients_count: installedClients.length,
      registered_clients_count: registeredClientsCount,
    })

    const formSchema = z.object(
      installedClients.reduce(
        (acc, client) => {
          const fieldName = getClientFieldName(client.client_type!)
          acc[fieldName] = z.boolean()
          return acc
        },
        {} as Record<string, z.ZodBoolean>
      )
    )

    const result = await promptForm({
      title: 'Manage Clients',
      defaultValues,
      resolver: zodV4Resolver(formSchema),
      fields: (form: UseFormReturn<Record<string, boolean>>) => (
        <div className="rounded-xl border">
          {installedClients.map((client) => {
            const fieldName = getClientFieldName(client.client_type!)
            const displayName = client.client_type!

            return (
              <div
                key={client.client_type}
                className="flex items-start gap-2 border-b p-4 align-middle last:border-b-0"
              >
                <Switch
                  id={fieldName}
                  checked={form.watch(fieldName) as boolean}
                  onCheckedChange={(checked) => {
                    form.setValue(fieldName, checked)
                    form.trigger(fieldName)
                  }}
                />

                <Label htmlFor={fieldName} className="text-sm font-medium">
                  {displayName}
                </Label>
              </div>
            )
          })}
        </div>
      ),
      buttons: {
        confirm: 'Save',
        cancel: 'Cancel',
      },
    })

    if (result) {
      await saveClients(result)
    }
  }

  return (
    <Button
      variant={variant}
      onClick={handleManageClients}
      className={className}
    >
      <Code className="mr-2 h-4 w-4" />
      Manage Clients
    </Button>
  )
}
