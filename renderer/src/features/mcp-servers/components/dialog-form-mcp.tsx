import { DialogFormRemoteMcp } from '@/features/mcp-servers/components/remote-mcp/dialog-form-remote-mcp'
import { DialogFormLocalMcp } from '@/features/mcp-servers/components/local-mcp/dialog-form-local-mcp'

export function DialogFormMcp({
  serverType,
  onOpenChange,
  serverToEdit,
}: {
  serverType: { local: boolean; remote: boolean }
  onOpenChange: (serverType: { local: boolean; remote: boolean }) => void
  serverToEdit?: string | null
}) {
  return (
    <>
      <DialogFormLocalMcp
        isOpen={serverType.local}
        onOpenChange={() => onOpenChange({ local: false, remote: false })}
        serverToEdit={serverToEdit}
      />

      <DialogFormRemoteMcp
        onOpenChange={() => onOpenChange({ local: false, remote: false })}
        serverToEdit={serverToEdit}
        isOpen={serverType.remote}
      />
    </>
  )
}
