import { DialogFormRemoteMcp } from '@/features/mcp-servers/components/remote-mcp/dialog-form-remote-mcp'
import { DialogFormLocalMcp } from '@/features/mcp-servers/components/local-mcp/dialog-form-local-mcp'

export function WrapperDialogFormMcp({
  serverType,
  closeDialog,
  serverToEdit,
  groupName,
}: {
  serverType: { local: boolean; remote: boolean }
  closeDialog: () => void
  serverToEdit?: string | null
  groupName: string
}) {
  return (
    <>
      <DialogFormLocalMcp
        key={`local-${serverToEdit || 'new'}-${groupName}`}
        isOpen={serverType.local}
        closeDialog={closeDialog}
        serverToEdit={serverToEdit}
        groupName={groupName}
      />

      <DialogFormRemoteMcp
        key={`remote-${serverToEdit || 'new'}-${groupName}`}
        closeDialog={closeDialog}
        serverToEdit={serverToEdit}
        isOpen={serverType.remote}
        groupName={groupName}
      />
    </>
  )
}
