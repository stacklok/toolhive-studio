import { usePrompt } from '@/common/hooks/use-prompt'
import type { UseFormReturn } from 'react-hook-form'
import { Label } from '@/common/components/ui/label'
import { Button } from '@/common/components/ui/button'
import { Switch } from '@/common/components/ui/switch'
import { Code } from 'lucide-react'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useManageClients } from '../hooks/use-manage-clients'

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
  const promptForm = usePrompt()

  const {
    installedClients,
    defaultValues,
    reconcileGroupClients,
    getClientDisplayName,
    getClientFieldName,
  } = useManageClients(groupName)

  const handleManageClients = async () => {
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
        <div className="space-y-6">
          {installedClients.map((client) => {
            const fieldName = getClientFieldName(client.client_type!)
            const displayName = getClientDisplayName(client.client_type!)

            return (
              <div
                key={client.client_type}
                className="flex items-center justify-between"
              >
                <Label htmlFor={fieldName} className="text-sm font-medium">
                  {displayName}
                </Label>
                <Switch
                  id={fieldName}
                  checked={form.watch(fieldName) as boolean}
                  onCheckedChange={(checked) => {
                    form.setValue(fieldName, checked)
                    form.trigger(fieldName)
                  }}
                />
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
      // error handling in the hook
      await reconcileGroupClients(result)
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
