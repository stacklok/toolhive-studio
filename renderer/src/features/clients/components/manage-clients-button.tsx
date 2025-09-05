import { usePrompt } from '@/common/hooks/use-prompt'
import { Label } from '@/common/components/ui/label'
import { Button } from '@/common/components/ui/button'
import { Switch } from '@/common/components/ui/switch'
import { Code } from 'lucide-react'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'

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

  const handleManageClients = async () => {
    // Create a custom schema for the form with 3 boolean toggles
    const formSchema = z.object({
      enableVSCode: z.boolean(),
      enableCursor: z.boolean(),
      enableClaudeCode: z.boolean(),
    })

    const result = await promptForm({
      title: 'Manage Clients',
      description: `Configure clients for group: ${groupName}`,
      defaultValues: {
        enableVSCode: false,
        enableCursor: false,
        enableClaudeCode: false,
      },
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
      // TODO: Implement actual client management logic based on toggle states
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
