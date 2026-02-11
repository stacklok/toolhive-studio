import { DialogFormRemoteMcp } from '@/features/mcp-servers/components/remote-mcp/dialog-form-remote-mcp'
import { DialogFormLocalMcp } from '@/features/mcp-servers/components/local-mcp/dialog-form-local-mcp'

export function WrapperDialogFormMcp({
  serverType,
  closeDialog,
  serverToEdit,
  groupName,
  imageOverride,
  envVarsOverride,
}: {
  serverType: { local: boolean; remote: boolean }
  closeDialog: () => void
  serverToEdit?: string | null
  groupName: string
  imageOverride?: string | null
  envVarsOverride?: Array<{ name: string; value: string }> | null
}) {
  return (
    <>
      <DialogFormLocalMcp
        key={`local-${serverToEdit || 'new'}-${groupName}`}
        isOpen={serverType.local}
        closeDialog={closeDialog}
        serverToEdit={serverToEdit}
        groupName={groupName}
        imageOverride={imageOverride}
        envVarsOverride={envVarsOverride}
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
