import { useState, useEffect, useRef } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronRight, Code } from 'lucide-react'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { Button } from '@/common/components/ui/button'
import { RefreshButton } from '@/common/components/refresh-button'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { DeprecatedDialogFormRunMcpServerWithCommand } from '@/features/mcp-servers/components/dialog-form-run-mcp-command'
import { GridCardsMcpServers } from '@/features/mcp-servers/components/grid-cards-mcp-server'
import { DropdownMenuRunMcpServer } from '@/features/mcp-servers/components/menu-run-mcp-server'
import { useMutationRestartServerAtStartup } from '@/features/mcp-servers/hooks/use-mutation-restart-server'
import { TitlePage } from '@/common/components/title-page'
import { McpServersSidebar } from '@/features/mcp-servers/components/mcp-servers-sidebar'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../utils/feature-flags'
import { usePrompt } from '@/common/hooks/use-prompt'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import type { UseFormReturn } from 'react-hook-form'

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

function GroupRoute() {
  const { groupName } = Route.useParams()
  const showSidebar = useFeatureFlag(featureFlagKeys.GROUPS)
  const promptForm = usePrompt()

  const { data, refetch } = useSuspenseQuery({
    ...getApiV1BetaWorkloadsOptions({
      query: {
        all: true,
        group: groupName,
      },
    }),
  })

  const workloads = data?.workloads ?? []
  const filteredWorkloads = workloads
  const [isRunWithCommandOpen, setIsRunWithCommandOpen] = useState(false)
  const { mutateAsync, isPending } = useMutationRestartServerAtStartup()
  const hasProcessedShutdown = useRef(false)

  const handleManageClients = async () => {
    // Create a custom schema for the form
    const formSchema = z.object({
      clientName: z.string().min(1, 'Client name is required'),
      action: z.enum(['add', 'remove', 'list'], {
        required_error: 'Please select an action',
      }),
      description: z.string().optional(),
    })

    const result = await promptForm({
      title: 'Manage Clients',
      description: `Manage clients for group: ${groupName}`,
      defaultValues: {
        clientName: '',
        action: 'add' as const,
        description: '',
      },
      resolver: zodV4Resolver(formSchema),
      fields: (form: UseFormReturn<{ clientName: string; action: 'add' | 'remove' | 'list'; description?: string }>) => (
        <div className="space-y-4">
          <div>
            <Label htmlFor="clientName" className="mb-2 block text-sm font-medium">
              Client Name
            </Label>
            <Input
              id="clientName"
              placeholder="Enter client name..."
              {...form.register('clientName')}
            />
            {form.formState.errors.clientName && (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.clientName.message}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="action" className="mb-2 block text-sm font-medium">
              Action
            </Label>
            <select
              id="action"
              {...form.register('action')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="add">Add to group</option>
              <option value="remove">Remove from group</option>
              <option value="list">List clients</option>
            </select>
            {form.formState.errors.action && (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.action.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="mb-2 block text-sm font-medium">
              Description (Optional)
            </Label>
            <Input
              id="description"
              placeholder="Enter description..."
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>
        </div>
      ),
      buttons: {
        confirm: 'Execute',
        cancel: 'Cancel',
      },
    })
    
    if (result) {
      console.log('Manage clients result:', result)
      // TODO: Implement actual client management logic based on result.action
    }
  }

  useEffect(() => {
    const handleShutdownRestart = async () => {
      try {
        if (hasProcessedShutdown.current) return
        hasProcessedShutdown.current = true

        const shutdownServers =
          await window.electronAPI.shutdownStore.getLastShutdownServers()
        if (shutdownServers.length === 0) return

        await mutateAsync({
          body: { names: shutdownServers.map((server) => server.name!) },
        })
      } catch (error) {
        console.error('Error during shutdown server restart:', error)
      }
    }

    handleShutdownRestart()
  }, [mutateAsync])

  return (
    <div className="flex h-full gap-6">
      {showSidebar ? <McpServersSidebar /> : null}
      <div
        className={showSidebar ? 'ml-sidebar min-w-0 flex-1' : 'min-w-0 flex-1'}
      >
        <TitlePage title="MCP Servers">
          {workloads.length > 0 && (
            <div className="ml-auto flex gap-2">
              <RefreshButton refresh={refetch} />
              <DropdownMenuRunMcpServer
                openRunCommandDialog={() => setIsRunWithCommandOpen(true)}
              />
              <Button variant="outline" onClick={handleManageClients}>
                <Code className="mr-2 h-4 w-4" />
                Manage clients
              </Button>
            </div>
          )}
          <DeprecatedDialogFormRunMcpServerWithCommand
            isOpen={isRunWithCommandOpen}
            onOpenChange={setIsRunWithCommandOpen}
          />
        </TitlePage>
        {!isPending && !filteredWorkloads.length ? (
          <EmptyState
            title="Add your first MCP server"
            body="You can add a server by running it with a command or by browsing the registry"
            actions={[
              <Button
                variant="outline"
                key="add-custom-server"
                onClick={() => setIsRunWithCommandOpen(true)}
              >
                Add custom server
              </Button>,
              <div key="secondary-actions" className="flex gap-2">
                <Button asChild variant="outline">
                  <LinkViewTransition to="/registry">
                    Browse registry <ChevronRight />
                  </LinkViewTransition>
                </Button>
                <Button variant="outline" onClick={handleManageClients}>
                  <Code className="mr-2 h-4 w-4" />
                  Manage clients
                </Button>
              </div>,
            ]}
            illustration={IllustrationNoConnection}
          />
        ) : (
          <GridCardsMcpServers mcpServers={filteredWorkloads} />
        )}
      </div>
    </div>
  )
}
