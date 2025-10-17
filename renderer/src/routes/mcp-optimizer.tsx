import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import { TitlePage } from '@/common/components/title-page'
import { McpServersSidebar } from '@/features/mcp-servers/components/mcp-servers-sidebar'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../utils/feature-flags'
import { ManageClientsButton } from '@/features/clients/components/manage-clients-button'
import { useGroups } from '@/features/mcp-servers/hooks/use-groups'
import { Checkbox } from '@/common/components/ui/checkbox'
import { Label } from '@/common/components/ui/label'
import { Button } from '@/common/components/ui/button'
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/common/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/mcp-optimizer')({
  component: McpOptimizerRoute,
})

function McpOptimizerRoute() {
  const showSidebar = useFeatureFlag(featureFlagKeys.GROUPS)
  const { data: groupsData } = useGroups()
  const groups = groupsData?.groups ?? []

  // Fetch all workloads to see which servers are in each group
  const { data: workloadsData } = useQuery({
    ...getApiV1BetaWorkloadsOptions({
      query: {
        all: true,
      },
    }),
  })

  const workloads = workloadsData?.workloads ?? []

  // Group servers by group name
  const serversByGroup = useMemo(() => {
    const grouped: Record<string, string[]> = {}
    workloads.forEach((workload) => {
      const groupName = workload.group ?? 'default'
      if (!grouped[groupName]) {
        grouped[groupName] = []
      }
      if (workload.name) {
        grouped[groupName].push(workload.name)
      }
    })
    return grouped
  }, [workloads])

  return (
    <div className="flex h-full gap-6">
      {showSidebar ? <McpServersSidebar /> : null}
      <div
        className={showSidebar ? 'ml-sidebar min-w-0 flex-1' : 'min-w-0 flex-1'}
      >
        <TitlePage title="MCP Optimizer">
          <>
            <div className="flex gap-2 lg:ml-auto">
              <ManageClientsButton groupName="mcp-optimizer" />
            </div>
          </>
        </TitlePage>
        <div className="p-6">
          <div className="mx-auto max-w-2xl">
            <Alert className="mb-6">
              <AlertTriangle />
              <AlertTitle>Experimental Feature</AlertTitle>
              <AlertDescription>
                This is an experimental feature currently under development.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle />
              <AlertTitle>Unoptimized Access Detected</AlertTitle>
              <AlertDescription>
                <p>
                  The <strong>claude</strong> client has unoptimized access to
                  the <strong>foobar</strong> group. We recommend disabling the{' '}
                  <strong>claude</strong> client in the <strong>foobar</strong>{' '}
                  group and enabling optimization for the{' '}
                  <strong>foobar</strong> group.
                </p>
              </AlertDescription>
            </Alert>
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
            <div className="rounded-xl border">
              {groups.map((group) => {
                const groupName = group.name ?? ''
                const servers = serversByGroup[groupName] ?? []
                const serverCount = servers.length

                return (
                  <div
                    key={groupName}
                    className="flex items-start gap-3 border-b p-4
                      last:border-b-0"
                  >
                    <Checkbox id={groupName} className="mt-0.5" />
                    <div className="flex flex-1 flex-col gap-1">
                      <Label
                        htmlFor={groupName}
                        className="text-sm font-medium"
                      >
                        {groupName}
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        {serverCount === 0 ? 'No servers' : servers.join(', ')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <Button>Apply Changes</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
