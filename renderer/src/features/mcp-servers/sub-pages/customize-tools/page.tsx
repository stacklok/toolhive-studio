import { LinkViewTransition } from '@/common/components/link-view-transition'
import { Button } from '@/common/components/ui/button'
import { CustomizeToolsTable } from '@/features/mcp-servers/components/customize-tools-table'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useUpdateServer } from '@/features/mcp-servers/hooks/use-update-server'
import { toast } from 'sonner'
import { convertWorkloadToFormData } from '@/features/mcp-servers/lib/orchestrate-run-local-server'
import { getApiV1BetaWorkloads } from '@api/sdk.gen'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'

export function CustomizeToolsPage() {
  const { serverName } = useParams({ from: '/customize-tools/$serverName' })
  const { checkServerStatus } = useCheckServerStatus()
  const { data: workload, isLoading: isWorkloadLoading } = useSuspenseQuery({
    queryKey: ['workload', serverName],
    queryFn: async () => {
      const { data } = await getApiV1BetaWorkloads({
        query: {
          all: true,
        },
      })
      // TODO: GET single server do not return the correct port?
      return data?.workloads?.find((item) => item.name === serverName) ?? null
    },
  })

  const { data: serverTools, isLoading } = useQuery({
    queryKey: ['workload-available-tools', serverName, workload?.name],
    queryFn: async () => {
      if (!workload) return null
      const results =
        await window.electronAPI.utils.getWorkloadAvailableTools(workload)
      // for showing the loading state
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return results
    },
    enabled:
      !!serverName && !isWorkloadLoading && workload?.status === 'running',
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  const { updateServerMutation } = useUpdateServer(serverName)

  const handleApply = async (enabledTools: Record<string, boolean>) => {
    if (!serverTools) {
      toast.error('Server data not loaded')
      return
    }

    try {
      // Step 1: Save enabled tools using temporary API
      const enabledToolNames = Object.entries(enabledTools)
        .filter(([, enabled]) => enabled)
        .map(([toolName]) => toolName)

      const toolsSaveResult = await window.electronAPI.chat.saveEnabledMcpTools(
        serverName,
        enabledToolNames
      )

      if (!toolsSaveResult.success) {
        throw new Error(toolsSaveResult.error || 'Failed to save tool settings')
      }

      // Step 2: Update server with existing data
      if (!workload) {
        throw new Error('Workload data not available')
      }

      const formData = convertWorkloadToFormData(workload)
      updateServerMutation(
        { data: formData },
        {
          onSuccess: () => {
            checkServerStatus({ serverName, isEditing: true })
            toast.success('Server tools updated successfully')
          },
          onError: (error) => {
            toast.error(
              `Failed to update server: ${typeof error === 'string' ? error : error.message}`
            )
          },
        }
      )
    } catch (error) {
      toast.error(
        `Failed to apply changes: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const handleCancel = () => {
    // Navigate back or reset - for now just go back
    window.history.back()
  }

  return (
    <div className="">
      <div className="mb-2">
        <LinkViewTransition to="/group/default">
          <Button
            variant="ghost"
            aria-label="Back"
            className="text-muted-foreground"
          >
            <ChevronLeft className="size-5" />
            Back
          </Button>
        </LinkViewTransition>
      </div>
      <div className="mb-5 flex flex-col gap-5">
        <h1 className="m-0 mb-0 p-0 text-3xl font-bold">
          Customize Tools for {serverName}
        </h1>
        {workload?.status !== 'running' ? (
          <div>Server is not running</div>
        ) : (
          <CustomizeToolsTable
            tools={
              serverTools
                ? Object.entries(serverTools).map(([name, toolDef]) => ({
                    name,
                    description: toolDef.description,
                  }))
                : []
            }
            isLoading={isWorkloadLoading || isLoading}
            onApply={handleApply}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  )
}
