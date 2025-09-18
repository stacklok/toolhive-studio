import { usePrompt } from '@/common/hooks/use-prompt'
import type { UseFormReturn } from 'react-hook-form'
import { Label } from '@/common/components/ui/label'
import { Switch } from '@/common/components/ui/switch'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useManageClients } from './use-manage-clients'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'

export function useManageClientsDialog(groupName: string) {
  const promptForm = usePrompt()
  const {
    installedClients,
    defaultValues,
    reconcileGroupClients,
    getClientFieldName,
  } = useManageClients(groupName)

  const { mutateAsync: saveClients } = useToastMutation({
    mutationFn: reconcileGroupClients,
    loadingMsg: 'Saving client settings...',
    successMsg: 'Client settings saved',
    errorMsg: 'Failed to save client settings',
  })

  const openDialog = async (opts?: {
    title?: string
    confirmText?: string
  }) => {
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
      title: opts?.title ?? 'Manage Clients',
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
        confirm: opts?.confirmText ?? 'Save',
        cancel: 'Cancel',
      },
    })

    if (result) {
      await saveClients(result)
    }
  }

  return { openDialog }
}
