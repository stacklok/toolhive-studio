import { usePrompt } from '@/common/hooks/use-prompt'
import { Label } from '@/common/components/ui/label'
import { Button } from '@/common/components/ui/button'
import { Switch } from '@/common/components/ui/switch'
import { Code } from 'lucide-react'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
// import { useAddClientToGroup } from '../hooks/use-add-client-to-group'
// import { useRemoveClientFromGroup } from '../hooks/use-remove-client-from-group'

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
    (group) => group.name === groupName
  )
  const registeredClientsInGroup = currentGroup?.registered_clients || []

  // TODO: Initialize hooks for client management when ready
  // const { addClientToGroup } = useAddClientToGroup({ clientType: 'vscode' })
  // const { addClientToGroup: addCursorToGroup } = useAddClientToGroup({ clientType: 'cursor' })
  // const { addClientToGroup: addClaudeCodeToGroup } = useAddClientToGroup({ clientType: 'claude-code' })

  // const { removeClientFromGroup } = useRemoveClientFromGroup({ clientType: 'vscode' })
  // const { removeClientFromGroup: removeCursorFromGroup } = useRemoveClientFromGroup({ clientType: 'cursor' })
  // const { removeClientFromGroup: removeClaudeCodeFromGroup } = useRemoveClientFromGroup({ clientType: 'claude-code' })

  const handleManageClients = async () => {
    // Create a custom schema for the form with 3 boolean toggles
    const formSchema = z.object({
      enableVSCode: z.boolean(),
      enableCursor: z.boolean(),
      enableClaudeCode: z.boolean(),
    })

    // Calculate default values based on current group membership
    const defaultValues = {
      enableVSCode: registeredClientsInGroup.includes('vscode'),
      enableCursor: registeredClientsInGroup.includes('cursor'),
      enableClaudeCode: registeredClientsInGroup.includes('claude-code'),
    }

    const result = await promptForm({
      title: 'Manage Clients',
      description: `Configure clients for group: ${groupName}`,
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
        confirm: 'Save Configuration',
        cancel: 'Cancel',
      },
    })

    if (result) {
      console.log('Manage clients result:', result)

      // TODO: Handle client management based on form result
      // For now, just log what would happen
      console.log('Would manage clients:', {
        groupName,
        currentClients: registeredClientsInGroup,
        newState: result,
        changes: {
          vscode:
            result.enableVSCode !== registeredClientsInGroup.includes('vscode'),
          cursor:
            result.enableCursor !== registeredClientsInGroup.includes('cursor'),
          claudeCode:
            result.enableClaudeCode !==
            registeredClientsInGroup.includes('claude-code'),
        },
      })
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
