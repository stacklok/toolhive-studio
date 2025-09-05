import { usePrompt } from '@/common/hooks/use-prompt'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { Button } from '@/common/components/ui/button'
import { Code } from 'lucide-react'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import type { UseFormReturn } from 'react-hook-form'

interface ManageClientsButtonProps {
  groupName: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  className?: string
}

export function ManageClientsButton({ 
  groupName, 
  variant = 'outline',
  className 
}: ManageClientsButtonProps) {
  const promptForm = usePrompt()

  const handleManageClients = async () => {
    // Create a custom schema for the form
    const formSchema = z.object({
      clientName: z.string().min(1, 'Client name is required'),
      action: z.enum(['add', 'remove', 'list'], {
        required_error: 'Please select an action',
      }),
      description: z.string().optional(),
    })

    const result = await promptForm({
      title: 'Manage Clients',
      description: `Manage clients for group: ${groupName}`,
      defaultValues: {
        clientName: '',
        action: 'add' as const,
        description: '',
      },
      resolver: zodV4Resolver(formSchema),
      fields: (form: UseFormReturn<{ clientName: string; action: 'add' | 'remove' | 'list'; description?: string }>) => (
        <div className="space-y-4">
          <div>
            <Label htmlFor="clientName" className="mb-2 block text-sm font-medium">
              Client Name
            </Label>
            <Input
              id="clientName"
              placeholder="Enter client name..."
              {...form.register('clientName')}
            />
            {form.formState.errors.clientName && (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.clientName.message}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="action" className="mb-2 block text-sm font-medium">
              Action
            </Label>
            <select
              id="action"
              {...form.register('action')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="add">Add to group</option>
              <option value="remove">Remove from group</option>
              <option value="list">List clients</option>
            </select>
            {form.formState.errors.action && (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.action.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="mb-2 block text-sm font-medium">
              Description (Optional)
            </Label>
            <Input
              id="description"
              placeholder="Enter description..."
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>
        </div>
      ),
      buttons: {
        confirm: 'Execute',
        cancel: 'Cancel',
      },
    })
    
    if (result) {
      console.log('Manage clients result:', result)
      // TODO: Implement actual client management logic based on result.action
    }
  }

  return (
    <Button variant={variant} onClick={handleManageClients} className={className}>
      <Code className="mr-2 h-4 w-4" />
      Manage clients
    </Button>
  )
}
