import { Dialog } from '@/common/components/ui/dialog'
import { FormFieldsLocalMcp } from './local-mcp/form-fields-local-mcp'
import type { CoreWorkload } from '@api/types.gen'
import { FormFieldsRemoteMcp } from './remote-mcp/form-fields-remote-mcp'

export function DialogFormMcp({
  serverType,
  onOpenChange,
  workloads = [],
  serverToEdit,
}: {
  serverType: { local: boolean; remote: boolean }
  onOpenChange: (serverType: { local: boolean; remote: boolean }) => void
  workloads?: CoreWorkload[]
  serverToEdit?: string | null
}) {
  return (
    <Dialog
      open={serverType.local || serverType.remote}
      onOpenChange={() => onOpenChange({ local: false, remote: false })}
    >
      {serverType.local && (
        <FormFieldsLocalMcp
          onOpenChange={onOpenChange}
          serverToEdit={serverToEdit}
        />
      )}
      {serverType.remote && (
        <FormFieldsRemoteMcp
          workloads={workloads}
          onOpenChange={onOpenChange}
          serverToEdit={serverToEdit}
        />
      )}
    </Dialog>
  )
}
