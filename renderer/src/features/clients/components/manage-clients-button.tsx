import { usePrompt } from '@/common/hooks/use-prompt'
import { Label } from '@/common/components/ui/label'
import { Button } from '@/common/components/ui/button'
import { Switch } from '@/common/components/ui/switch'
import { Code } from 'lucide-react'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
import { useAddClientToGroup } from '../hooks/use-add-client-to-group'
import { useRemoveClientFromGroup } from '../hooks/use-remove-client-from-group'

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

  // Initialize hooks for client management
  const { addClientToGroup } = useAddClientToGroup({ clientType: 'vscode' })
  const { addClientToGroup: addCursorToGroup } = useAddClientToGroup({
    clientType: 'cursor',
  })
  const { addClientToGroup: addClaudeCodeToGroup } = useAddClientToGroup({
    clientType: 'claude-code',
  })

  const { removeClientFromGroup } = useRemoveClientFromGroup({
    clientType: 'vscode',
  })
  const { removeClientFromGroup: removeCursorFromGroup } =
    useRemoveClientFromGroup({ clientType: 'cursor' })
  const { removeClientFromGroup: removeClaudeCodeFromGroup } =
    useRemoveClientFromGroup({ clientType: 'claude-code' })

  const handleManageClients = async () => {
    // Store original values before opening the form
    const originalValues = {
      enableVSCode: registeredClientsInGroup.includes('vscode'),
      enableCursor: registeredClientsInGroup.includes('cursor'),
      enableClaudeCode: registeredClientsInGroup.includes('claude-code'),
    }

    console.log('Original client status for group:', groupName, originalValues)

    // Create a custom schema for the form with 3 boolean toggles
    const formSchema = z.object({
      enableVSCode: z.boolean(),
      enableCursor: z.boolean(),
      enableClaudeCode: z.boolean(),
    })

    // Use original values as default values for the form
    const defaultValues = originalValues

    const result = await promptForm({
      title: 'Manage Clients',
      defaultValues,
      resolver: zodV4Resolver(formSchema),
      fields: (form) => (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="enableVSCode" className="text-sm font-medium">
              VS Code - Copilot
            </Label>
            <Switch
              id="enableVSCode"
              checked={form.watch('enableVSCode') as boolean}
              onCheckedChange={(checked) => {
                form.setValue('enableVSCode', checked)
                form.trigger('enableVSCode')
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="enableCursor" className="text-sm font-medium">
              Cursor
            </Label>
            <Switch
              id="enableCursor"
              checked={form.watch('enableCursor') as boolean}
              onCheckedChange={(checked) => {
                form.setValue('enableCursor', checked)
                form.trigger('enableCursor')
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="enableClaudeCode" className="text-sm font-medium">
              Claude Code
            </Label>
            <Switch
              id="enableClaudeCode"
              checked={form.watch('enableClaudeCode') as boolean}
              onCheckedChange={(checked) => {
                form.setValue('enableClaudeCode', checked)
                form.trigger('enableClaudeCode')
              }}
            />
          </div>
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
        enableVSCode: result.enableVSCode,
        enableCursor: result.enableCursor,
        enableClaudeCode: result.enableClaudeCode,
        groupName: groupName,
      })

      // Calculate which values have changed
      const changes = {
        vscode: result.enableVSCode !== originalValues.enableVSCode,
        cursor: result.enableCursor !== originalValues.enableCursor,
        claudeCode: result.enableClaudeCode !== originalValues.enableClaudeCode,
      }

      console.log('Changes detected:', changes)

      // Only save changes that actually changed
      try {
        // VS Code client - only if it changed
        if (changes.vscode) {
          if (result.enableVSCode) {
            console.log('Adding VS Code client to group:', groupName)
            await addClientToGroup({ groupName })
          } else {
            console.log('Removing VS Code client from group:', groupName)
            await removeClientFromGroup({ groupName })
          }
        }

        // Cursor client - only if it changed
        if (changes.cursor) {
          if (result.enableCursor) {
            console.log('Adding Cursor client to group:', groupName)
            await addCursorToGroup({ groupName })
          } else {
            console.log('Removing Cursor client from group:', groupName)
            await removeCursorFromGroup({ groupName })
          }
        }

        // Claude Code client - only if it changed
        if (changes.claudeCode) {
          if (result.enableClaudeCode) {
            console.log('Adding Claude Code client to group:', groupName)
            await addClaudeCodeToGroup({ groupName })
          } else {
            console.log('Removing Claude Code client from group:', groupName)
            await removeClaudeCodeFromGroup({ groupName })
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
