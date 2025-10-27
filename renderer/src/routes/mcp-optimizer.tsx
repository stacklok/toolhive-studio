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
import { Settings, Text, Edit3, ExternalLinkIcon } from 'lucide-react'
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
import { useOptimizedGroupName } from '@/common/hooks/use-optimize-group-name'

export const Route = createFileRoute('/mcp-optimizer')({
  component: McpOptimizerRoute,
})

function McpOptimizerContent() {
  const groups = useMcpOptimizerGroups()
  const { state, openDialog, closeDialog } = useEditServerDialog()
  const optimizedGroupName = useOptimizedGroupName()

  const handleCustomizeConfiguration = () => {
    const isRemote = false
    openDialog(META_MCP_SERVER_NAME, isRemote, MCP_OPTIMIZER_GROUP_NAME)
  }

  return (
    <div className="flex h-full gap-6">
      <McpServersSidebar />
      <div className={'ml-sidebar min-w-0 flex-1'}>
        <TitlePage title="MCP Optimizer">
          <p className="text-muted-foreground text-sm">
            An intelligent intermediary that provides unified access to multiple
            MCP servers through a single endpoint. It intelligently routes
            requests to the appropriate MCP server and filters results to reduce
            token usage and improve performance. By using semantic search to
            find the most relevant tools and automatically maintaining an
            up-to-date index, it simplifies AI client configuration while
            optimizing tool discovery and usage.
            <span className="ml-1 inline-flex items-center gap-1">
              Refer to the{' '}
              <a
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-1
                  underline"
                href="https://docs.stacklok.com/toolhive/guides-ui/toolhive/guides-ui/mcp-optimizer"
                target="_blank"
              >
                documentation <ExternalLinkIcon size={12} />
              </a>
            </span>
          </p>
          {optimizedGroupName ? (
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
          ) : null}
        </TitlePage>
        <div className="p-6">
          <div className="mx-auto max-w-2xl">
            <OptimizerWarnings />
            <div className="mb-6">
              <h2 className="text-lg font-semibold">
                Select Group to Optimize
              </h2>
              <p className="text-muted-foreground text-sm">
                Choose which server group to optimize. The MCP Optimizer will
                index the tools in your selected group's servers to improve
                performance and discoverability.
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
