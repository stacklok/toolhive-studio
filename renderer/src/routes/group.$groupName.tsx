import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getApiV1BetaWorkloadsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { GridCardsMcpServers } from '@/features/mcp-servers/components/grid-cards-mcp-server'
import { TitlePage } from '@/common/components/title-page'
import { McpServersSidebar } from '@/features/mcp-servers/components/mcp-servers-sidebar'
import { RefreshButton } from '@/common/components/refresh-button'
import { DropdownMenuRunMcpServer } from '@/features/mcp-servers/components/dropdown-menu-run-mcp-server'
import { WrapperDialogFormMcp } from '@/features/mcp-servers/components/wrapper-dialog-mcp'
import { ManageClientsButton } from '@/features/clients/components/manage-clients-button'
import { GroupActionsDropdown } from '@/features/mcp-servers/components/group-actions-dropdown'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { useIsOptimizedGroupName } from '@/features/clients/hooks/use-is-optimized-group-name'
import { Button } from '@/common/components/ui/button'
import { Sparkles } from 'lucide-react'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { useAutoResumePolling } from '@/common/hooks/use-auto-resume-polling'

export const Route = createFileRoute('/group/$groupName')({
  loader: ({ context: { queryClient }, params: { groupName } }) =>
    queryClient.ensureQueryData(
      getApiV1BetaWorkloadsOptions({
        query: {
          all: true,
          group: groupName,
        },
      })
    ),
  component: GroupRoute,
})

function getPageTitle(groupName: string, isOptimizedGroupName: boolean) {
  if (!isOptimizedGroupName) {
    return groupName
  }

  return (
    <div className="flex items-center gap-2">
      {groupName}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="link"
            size="icon"
            asChild
            aria-label="View optimizer settings"
          >
            <LinkViewTransition to="/mcp-optimizer">
              <Sparkles className="size-4" />
            </LinkViewTransition>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          This group is optimized by the MCP Optimizer
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function GroupRoute() {
  const { groupName } = Route.useParams()
  const isOptimizedGroupName = useIsOptimizedGroupName(groupName)

  const { data, refetch } = useSuspenseQuery({
    ...getApiV1BetaWorkloadsOptions({
      query: {
        all: true,
        group: groupName,
      },
    }),
  })

  const workloads = data?.workloads ?? []

  useAutoResumePolling(workloads, groupName)

  const filteredWorkloads = workloads
  const [serverDialogOpen, setServerDialogOpen] = useState<{
    local: boolean
    remote: boolean
  }>({
    local: false,
    remote: false,
  })

  return (
    <div className="flex h-full gap-6">
      <McpServersSidebar currentGroupName={groupName} />
      <div className="ml-sidebar min-w-0 flex-1">
        <TitlePage title={getPageTitle(groupName, isOptimizedGroupName)}>
          <>
            <div className="flex gap-2 lg:ml-auto">
              {workloads.length > 0 && (
                <>
                  <RefreshButton refresh={refetch} />
                  <DropdownMenuRunMcpServer
                    openRunCommandDialog={setServerDialogOpen}
                  />
                </>
              )}
              <ManageClientsButton
                isOptimizedGroupName={isOptimizedGroupName}
                groupName={groupName}
              />

              <GroupActionsDropdown groupName={groupName} />
            </div>

            <WrapperDialogFormMcp
              serverType={serverDialogOpen}
              closeDialog={() =>
                setServerDialogOpen({ local: false, remote: false })
              }
              groupName={groupName}
            />
          </>
        </TitlePage>
        {!filteredWorkloads.length ? (
          <EmptyState
            title="Add your first MCP server"
            body="Add a server manually or browse the MCP Server registry"
            illustration={IllustrationNoConnection}
          >
            <div className="my-6">
              <DropdownMenuRunMcpServer
                openRunCommandDialog={setServerDialogOpen}
              />
            </div>
          </EmptyState>
        ) : (
          <GridCardsMcpServers mcpServers={filteredWorkloads} />
        )}
      </div>
    </div>
  )
}
