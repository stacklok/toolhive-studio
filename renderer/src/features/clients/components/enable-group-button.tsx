import { Button } from '@/common/components/ui/button'
import { Power, Code } from 'lucide-react'
import { useManageClientsDialog } from '../hooks/use-manage-clients-dialog'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'

export function EnableGroupButton({
  groupName,
  className,
}: {
  groupName: string
  className?: string
}) {
  const { openDialog } = useManageClientsDialog(groupName)
  const groupsEnabled = useFeatureFlag(featureFlagKeys.GROUPS)

  if (groupsEnabled) {
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

  // Temporary behavior while feature flag is off: keep green look
  return (
    <Button
      variant="enable"
      onClick={() => openDialog({ title: 'Add a client', confirmText: 'Add' })}
      className={className}
    >
      <Code className="mr-2 h-4 w-4" />
      Add a client
    </Button>
  )
}
