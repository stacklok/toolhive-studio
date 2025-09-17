import { Button } from '@/common/components/ui/button'
import { Code } from 'lucide-react'
import { useManageClientsDialog } from '../hooks/use-manage-clients-dialog'

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
  const { openDialog } = useManageClientsDialog(groupName)

  return (
    <Button
      variant={variant}
      onClick={() => openDialog()}
      className={className}
    >
      <Code className="mr-2 h-4 w-4" />
      Manage Clients
    </Button>
  )
}
