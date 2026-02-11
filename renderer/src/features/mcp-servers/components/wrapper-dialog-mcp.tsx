import { DialogFormRemoteMcp } from '@/features/mcp-servers/components/remote-mcp/dialog-form-remote-mcp'
import { DialogFormLocalMcp } from '@/features/mcp-servers/components/local-mcp/dialog-form-local-mcp'
import type { SecretOverride } from '../contexts/edit-server-dialog-context'

export function WrapperDialogFormMcp({
  serverType,
  closeDialog,
  serverToEdit,
  groupName,
  imageOverride,
  envVarsOverride,
  secretsOverride,
}: {
  serverType: { local: boolean; remote: boolean }
  closeDialog: () => void
  serverToEdit?: string | null
  groupName: string
  imageOverride?: string | null
  envVarsOverride?: Array<{ name: string; value: string }> | null
  secretsOverride?: SecretOverride[] | null
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
        secretsOverride={secretsOverride}
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
