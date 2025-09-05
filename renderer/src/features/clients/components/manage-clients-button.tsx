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
import { COMMON_CLIENTS } from '../constants'

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

  // Initialize dynamic client management
  const {
    addClientToGroup,
    removeClientFromGroup,
    getClientDisplayName,
    getClientFieldName,
  } = useManageClients()

  const handleManageClients = async () => {
    // Store original values before opening the form - dynamically generated
    const originalValues = COMMON_CLIENTS.reduce(
      (acc, clientName) => {
        const fieldName = getClientFieldName(clientName)
        acc[fieldName] = registeredClientsInGroup.includes(clientName)
        return acc
      },
      {} as Record<string, boolean>
    )

    console.log('Original client status for group:', groupName, originalValues)

    // Create a dynamic schema for the form with boolean toggles for each common client
    const formSchema = z.object(
      COMMON_CLIENTS.reduce(
        (acc, clientName) => {
          const fieldName = getClientFieldName(clientName)
          acc[fieldName] = z.boolean()
          return acc
        },
        {} as Record<string, z.ZodBoolean>
      )
    )

    // Use original values as default values for the form
    const defaultValues = originalValues

    const result = await promptForm({
      title: 'Manage Clients',
      defaultValues,
      resolver: zodV4Resolver(formSchema),
      fields: (form) => (
        <div className="space-y-6">
          {COMMON_CLIENTS.map((clientName) => {
            const fieldName = getClientFieldName(clientName)
            const displayName = getClientDisplayName(clientName)

            return (
              <div
                key={clientName}
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
      console.log('Manage clients form submitted with values:', result)
      console.log('Form values breakdown:', {
        ...result,
        groupName: groupName,
      })

      // Calculate which values have changed - dynamically generated
      const changes = COMMON_CLIENTS.reduce(
        (acc, clientName) => {
          const fieldName = getClientFieldName(clientName)
          acc[clientName] = result[fieldName] !== originalValues[fieldName]
          return acc
        },
        {} as Record<string, boolean>
      )

      console.log('Changes detected:', changes)

      // Only save changes that actually changed - dynamically processed
      try {
        for (const clientName of COMMON_CLIENTS) {
          if (changes[clientName]) {
            const fieldName = getClientFieldName(clientName)
            const isEnabled = result[fieldName]

            if (isEnabled) {
              console.log(`Adding ${clientName} client to group:`, groupName)
              await addClientToGroup(clientName, groupName)
            } else {
              console.log(
                `Removing ${clientName} client from group:`,
                groupName
              )
              await removeClientFromGroup(clientName, groupName)
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
      onClick={handleManageClients}
      className={className}
    >
      <Code className="mr-2 h-4 w-4" />
      Manage clients
    </Button>
  )
}
