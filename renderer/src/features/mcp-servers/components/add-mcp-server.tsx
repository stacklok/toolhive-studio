import type { CoreWorkload } from '@api/types.gen'
import { DialogFormMcp } from './dialog-form-mcp'
import { RefreshButton } from '@/common/components/refresh-button'
import { DropdownMenuRunMcpServer } from './dropdown-menu-run-mcp-server'

export function AddMcpServer({
  workloads,
  refetch,
  serverType,
  setServerType,
}: {
  workloads: CoreWorkload[]
  serverType: { local: boolean; remote: boolean }
  setServerType: (serverType: { local: boolean; remote: boolean }) => void
  refetch: () => void
}) {
  return (
    <>
      {workloads.length > 0 && (
        <div className="ml-auto flex gap-2">
          <RefreshButton refresh={refetch} />
          <DropdownMenuRunMcpServer openRunCommandDialog={setServerType} />
        </div>
      )}
      <DialogFormMcp serverType={serverType} onOpenChange={setServerType} />
    </>
  )
}
