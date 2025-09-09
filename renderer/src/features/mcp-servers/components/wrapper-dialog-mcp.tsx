import { DialogFormLocalMcp } from '@/features/mcp-servers/components/local-mcp/dialog-form-local-mcp'

export function WrapperDialogFormMcp({
  serverType,
  closeDialog,
  serverToEdit,
}: {
  serverType: { local: boolean; remote: boolean }
  closeDialog: () => void
  serverToEdit?: string | null
}) {
  return (
    <DialogFormLocalMcp
      isOpen={serverType.local}
      closeDialog={closeDialog}
      serverToEdit={serverToEdit}
    />
  )
}
