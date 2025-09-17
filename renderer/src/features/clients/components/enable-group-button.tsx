import { Button } from '@/common/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { useManageClientsDialog } from '../hooks/use-manage-clients-dialog'

export function EnableGroupButton({
  groupName,
  className,
}: {
  groupName: string
  className?: string
}) {
  const { openDialog } = useManageClientsDialog(groupName)
  return (
    <Button
      variant="outline"
      onClick={() =>
        openDialog({ title: 'Enable Group', confirmText: 'Enable' })
      }
      className={className}
    >
      <CheckCircle className="mr-2 h-4 w-4" />
      Enable group
    </Button>
  )
}
