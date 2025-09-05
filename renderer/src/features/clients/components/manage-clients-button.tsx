import { usePrompt } from '@/common/hooks/use-prompt'
import { Label } from '@/common/components/ui/label'
import { Button } from '@/common/components/ui/button'
import { Switch } from '@/common/components/ui/switch'
import { Code } from 'lucide-react'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
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
  const { promptForm } = usePrompt()

  // Get available clients from discovery API
  const { 
    installedClients, 
    addClientToGroup, 
    removeClientFromGroup, 
    getClientDisplayName, 
    getClientFieldName 
  } = useManageClients()

  // Fetch groups data to get current client status
  const { data: groupsData } = useQuery({
    queryKey: ['api', 'v1beta', 'groups'],
    queryFn: async () => {
      const response = await getApiV1BetaGroups({
        parseAs: 'text',
        responseStyle: 'data',
      })
      const parsed =
        typeof response === 'string' ? JSON.parse(response) : response
      return parsed
    },
    staleTime: 5_000,
  })

  // Get the current group and its registered clients
  const currentGroup = groupsData?.groups?.find(
    (group: { name: string; registered_clients?: string[] }) =>
      group.name === groupName
  )
  const registeredClientsInGroup = currentGroup?.registered_clients || []

  const handleManageClients = async () => {
    // Store original values before opening the form - dynamically generated
    const originalValues = installedClients.reduce((acc, client) => {
      const fieldName = getClientFieldName(client.client_type!)
      acc[fieldName] = registeredClientsInGroup.includes(client.client_type!)
      return acc
    }, {} as Record<string, boolean>)

    console.log('Original client status for group:', groupName, originalValues)

    // Create a dynamic schema for the form with boolean toggles for each installed client
    const formSchema = z.object(
      installedClients.reduce((acc, client) => {
        const fieldName = getClientFieldName(client.client_type!)
        acc[fieldName] = z.boolean()
        return acc
      }, {} as Record<string, z.ZodBoolean>)
    )

    // Set default values based on current group's registered clients - dynamically generated
    const defaultValues = installedClients.reduce((acc, client) => {
      const fieldName = getClientFieldName(client.client_type!)
      acc[fieldName] = registeredClientsInGroup.includes(client.client_type!)
      return acc
    }, {} as Record<string, boolean>)

    const result = await promptForm({
      title: 'Manage Clients',
      defaultValues,
      resolver: zodV4Resolver(formSchema),
      fields: (form) => (
        <div className="space-y-6">
          {installedClients.map((client) => {
            const fieldName = getClientFieldName(client.client_type!)
            const displayName = getClientDisplayName(client.client_type!)
            
            return (
              <div key={client.client_type} className="flex items-center justify-between">
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
      console.log('Manage clients form submitted with values:', result)
      console.log('Form values breakdown:', {
        ...result,
        groupName: groupName,
      })

      // Calculate which values have changed - dynamically generated
      const changes = installedClients.reduce((acc, client) => {
        const fieldName = getClientFieldName(client.client_type!)
        acc[client.client_type!] = result[fieldName] !== originalValues[fieldName]
        return acc
      }, {} as Record<string, boolean>)

      console.log('Changes detected:', changes)

      // Only save changes that actually changed - dynamically processed
      try {
        for (const client of installedClients) {
          const clientType = client.client_type!
          if (changes[clientType]) {
            const fieldName = getClientFieldName(clientType)
            const isEnabled = result[fieldName]
            
            if (isEnabled) {
              console.log(`Adding ${clientType} client to group:`, groupName)
              await addClientToGroup(clientType, groupName)
            } else {
              console.log(`Removing ${clientType} client from group:`, groupName)
              await removeClientFromGroup(clientType, groupName)
            }
          }
        }

        // Log summary of changes made
        const changesMade = Object.entries(changes)
          .filter(([, changed]) => changed)
          .map(([client]) => client)

        if (changesMade.length > 0) {
          console.log(
            'Successfully applied changes for:',
            changesMade.join(', ')
          )
        } else {
          console.log('No changes detected - no API calls made')
        }
      } catch (error) {
        console.error('Error managing clients:', error)
        // The hooks will handle error display via toast notifications
      }
    }
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleManageClients}
      className={className}
    >
      <Code className="mr-2 h-4 w-4" />
      Manage Clients
    </Button>
  )
}
