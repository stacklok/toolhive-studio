import { useState } from 'react'
import type { RegistryGroup } from '@common/api/generated/types.gen'
import { Button } from '@/common/components/ui/button'
import { Wrench } from 'lucide-react'
import { useGroupInstallValidation } from '../hooks/use-group-install-validation'
import { MultiServerInstallWizard } from './multi-server-install-wizard'

interface InstallGroupButtonProps {
  groupName: string
  group: RegistryGroup | undefined
}

export function InstallGroupButton({
  groupName,
  group,
}: InstallGroupButtonProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const { error: installError } = useGroupInstallValidation({
    groupName,
    group,
    skipValidation: isWizardOpen,
  })

  return (
    <>
      <div className="flex flex-col gap-2">
        <div>
          <Button
            variant="default"
            onClick={() => setIsWizardOpen(true)}
            disabled={!!installError}
          >
            <Wrench className="size-4" />
            Install group
          </Button>
        </div>
        {installError && (
          <p className="text-destructive text-sm">{installError}</p>
        )}
      </div>
      <MultiServerInstallWizard
        group={group}
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </>
  )
}
