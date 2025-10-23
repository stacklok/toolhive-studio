import { createFileRoute } from '@tanstack/react-router'
import { TitlePage } from '@/common/components/title-page'
import { McpServersSidebar } from '@/features/mcp-servers/components/mcp-servers-sidebar'
import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/common/components/ui/dropdown-menu'
import { Settings, Text, Edit3 } from 'lucide-react'
import { OptimizerWarnings } from '@/features/meta-mcp/components/optimizer-warnings'
import { GroupSelectorForm } from '@/features/meta-mcp/components/group-selector-form'
import { useMcpOptimizerGroups } from '@/features/meta-mcp/hooks/use-mcp-optimizer-groups'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import { EditServerDialogProvider } from '@/features/mcp-servers/contexts/edit-server-dialog-provider'
import { useEditServerDialog } from '@/features/mcp-servers/hooks/use-edit-server-dialog'
import { WrapperDialogFormMcp } from '@/features/mcp-servers/components/wrapper-dialog-mcp'
import { LinkViewTransition } from '@/common/components/link-view-transition'

export const Route = createFileRoute('/mcp-optimizer')({
  component: McpOptimizerRoute,
})

function McpOptimizerContent() {
  const groups = useMcpOptimizerGroups()
  const { state, openDialog, closeDialog } = useEditServerDialog()

  const handleCustomizeConfiguration = () => {
    const isRemote = false
    openDialog(META_MCP_SERVER_NAME, isRemote, MCP_OPTIMIZER_GROUP_NAME)
  }

  return (
    <div className="flex h-full gap-6">
      <McpServersSidebar />
      <div className={'ml-sidebar min-w-0 flex-1'}>
        <TitlePage title="MCP Optimizer">
          <>
            <div className="flex gap-2 lg:ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Advanced
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" role="menu" className="w-56">
                  <DropdownMenuItem
                    asChild
                    className="flex cursor-pointer items-center"
                  >
                    <LinkViewTransition
                      to="/logs/$groupName/$serverName"
                      params={{
                        serverName: META_MCP_SERVER_NAME,
                        groupName: MCP_OPTIMIZER_GROUP_NAME,
                      }}
                    >
                      <Text className="mr-2 h-4 w-4" />
                      MCP Optimizer logs
                    </LinkViewTransition>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center"
                    onClick={handleCustomizeConfiguration}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Customize MCP Optimizer configuration
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        </TitlePage>
        <div className="p-6">
          <div className="mx-auto max-w-2xl">
            <OptimizerWarnings groups={groups} />
            <div className="mb-6">
              <h2 className="text-lg font-semibold">
                Select Groups to Optimize
              </h2>
              <p className="text-muted-foreground text-sm">
                Choose which server groups should be included in optimization.
                Selected groups will have their server configurations analyzed
                and optimized.
              </p>
            </div>
            <GroupSelectorForm groups={groups} />
          </div>
        </div>
      </div>

      {state.isOpen && state.serverName && state.groupName && (
        <WrapperDialogFormMcp
          serverType={{ local: !state.isRemote, remote: state.isRemote }}
          closeDialog={closeDialog}
          serverToEdit={state.serverName}
          groupName={state.groupName}
        />
      )}
    </div>
  )
}

export function McpOptimizerRoute() {
  return (
    <EditServerDialogProvider>
      <McpOptimizerContent />
    </EditServerDialogProvider>
  )
}
