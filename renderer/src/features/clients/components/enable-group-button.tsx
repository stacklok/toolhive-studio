import { Button } from '@/common/components/ui/button'
import { Power } from 'lucide-react'
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
      variant="enable"
      onClick={() =>
        openDialog({ title: 'Enable Group', confirmText: 'Enable' })
      }
      className={className}
    >
      Enable group
      <Power className="ml-2 h-4 w-4" />
    </Button>
  )
}
